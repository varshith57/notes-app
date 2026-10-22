import { addDatabaseChangeListener, type SQLiteDatabase } from 'expo-sqlite';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { getSetting, setSetting } from '@/db/settingsRepo';

import { BACKUP_TABLES, exportSnapshot, hasAnyUserData, importSnapshot, type Snapshot } from './backup';
import { emitDataChanged } from './dataEvents';
import { confirmChoice } from './dialogs';
import { downloadBackup, findBackup, uploadBackup } from './drive';
import { formatTimestamp } from './format';
import {
  isGoogleConfigured,
  restoreGoogleSession,
  signInWithGoogle,
  signOutOfGoogle,
  type GoogleUser,
} from './googleAuth';
import { cancelAllReminders } from './reminders';
import { syncPendingReminders } from './taskActions';

// Google Drive backup: one JSON snapshot of all user data in the app's hidden Drive folder.
// While signed in with auto-backup on, any change is backed up a few seconds later
// (debounced), so a reinstall can restore everything after signing in again.

export interface SyncState {
  /** Google client IDs were provided at build time (otherwise backup is unavailable). */
  available: boolean;
  user: GoogleUser | null;
  autoBackup: boolean;
  lastBackupAt: string | null;
  lastError: string | null;
  busy: 'backup' | 'restore' | 'signin' | null;
}

const BACKUP_DELAY_MS = 5000;

let state: SyncState = {
  available: isGoogleConfigured && Platform.OS !== 'web',
  user: null,
  autoBackup: true,
  lastBackupAt: null,
  lastError: null,
  busy: null,
};
const listeners = new Set<() => void>();
const update = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const getSyncState = () => state;

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

let db: SQLiteDatabase | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Call once with the app database: restores the session and starts auto-backup. */
export async function initSync(database: SQLiteDatabase): Promise<void> {
  if (db) return;
  db = database;
  update({
    autoBackup: (await getSetting(db, 'backup_auto')) !== '0',
    lastBackupAt: await getSetting(db, 'last_backup_at'),
    lastError: await getSetting(db, 'last_backup_error'),
  });
  if (!state.available) return;

  try {
    update({ user: await restoreGoogleSession() });
  } catch {
    update({ user: null });
  }
  addDatabaseChangeListener(({ tableName }) => {
    if ((BACKUP_TABLES as readonly string[]).includes(tableName)) scheduleBackup();
  });
}

function scheduleBackup() {
  if (!state.user || !state.autoBackup) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    backupNow().catch(() => {});
  }, BACKUP_DELAY_MS);
}

const message = (e: unknown) =>
  e instanceof Error ? e.message.split('\n')[0] : 'Something went wrong. Check your connection.';

export async function backupNow(): Promise<void> {
  if (!db || !state.user || state.busy) return;
  update({ busy: 'backup' });
  try {
    const json = JSON.stringify(await exportSnapshot(db));
    const remote = await findBackup();
    await uploadBackup(json, remote?.id);
    const now = new Date().toISOString();
    await setSetting(db, 'last_backup_at', now);
    await setSetting(db, 'last_backup_error', null);
    update({ lastBackupAt: now, lastError: null });
  } catch (e) {
    await setSetting(db, 'last_backup_error', message(e));
    update({ lastError: message(e) });
    throw e;
  } finally {
    update({ busy: null });
  }
}

/** Replaces this phone's data with the Drive backup. Returns false if there's no backup. */
export async function restoreFromBackup(): Promise<boolean> {
  if (!db || !state.user) return false;
  update({ busy: 'restore' });
  try {
    const remote = await findBackup();
    if (!remote) return false;
    const snap = (await downloadBackup(remote.id)) as Snapshot;
    await cancelAllReminders();
    await importSnapshot(db, snap);
    await syncPendingReminders(db);
    emitDataChanged('notes');
    emitDataChanged('finance');
    emitDataChanged('tasks');
    return true;
  } finally {
    update({ busy: null });
  }
}

/**
 * Interactive sign-in. If a backup already exists: an empty phone (e.g. after reinstalling)
 * restores it automatically; otherwise the user chooses between the backup and this phone.
 */
export async function signIn(): Promise<'signed-in' | 'cancelled'> {
  if (!db) return 'cancelled';
  update({ busy: 'signin' });
  let user: GoogleUser | null;
  try {
    user = await signInWithGoogle();
  } finally {
    update({ busy: null });
  }
  if (!user) return 'cancelled';
  update({ user });
  await setSetting(db, 'backup_email', user.email);

  const remote = await findBackup();
  if (remote) {
    const restore =
      !(await hasAnyUserData(db)) ||
      (await confirmChoice(
        'Restore your backup?',
        `Your Google account has a backup from ${formatTimestamp(remote.modifiedTime)}. Restoring replaces what's on this phone. Keeping this phone's data replaces the backup instead.`,
        'Restore backup',
        'Keep this phone',
      ));
    if (restore) await restoreFromBackup();
  }
  await backupNow().catch(() => {});
  return 'signed-in';
}

export async function signOut(): Promise<void> {
  if (!db) return;
  if (timer) clearTimeout(timer);
  await signOutOfGoogle();
  await setSetting(db, 'backup_email', null);
  update({ user: null });
}

export async function setAutoBackup(on: boolean): Promise<void> {
  if (!db) return;
  await setSetting(db, 'backup_auto', on ? '1' : '0');
  update({ autoBackup: on });
  if (on) scheduleBackup();
}
