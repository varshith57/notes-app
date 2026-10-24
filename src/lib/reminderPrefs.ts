import type { SQLiteDatabase } from 'expo-sqlite';
import { useSyncExternalStore } from 'react';

import { getSetting, setSetting } from '@/db/settingsRepo';

// Reminder preferences chosen in Settings: on/off, which tone plays, and whether it rings
// at alarm volume (through silent mode) or as a normal notification.

export type ReminderTone = 'alarm' | 'digital' | 'chime' | 'bell' | 'gentle' | 'system' | 'silent';

/** Tones in the order Settings lists them. `file` is bundled via the expo-notifications plugin. */
export const REMINDER_TONES: { key: ReminderTone; label: string; file: string | null }[] = [
  { key: 'alarm', label: 'Alarm', file: 'alarm.wav' },
  { key: 'digital', label: 'Digital clock', file: 'digital.wav' },
  { key: 'chime', label: 'Chime', file: 'chime.wav' },
  { key: 'bell', label: 'Bell', file: 'bell.wav' },
  { key: 'gentle', label: 'Gentle', file: 'gentle.wav' },
  { key: 'system', label: 'Phone’s notification sound', file: null },
  { key: 'silent', label: 'Vibrate only', file: null },
];

export type ReminderPrefs = { enabled: boolean; tone: ReminderTone; loud: boolean };

let prefs: ReminderPrefs = { enabled: true, tone: 'alarm', loud: true };
let db: SQLiteDatabase | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export async function initReminderPrefs(database: SQLiteDatabase): Promise<void> {
  db = database;
  const [enabled, tone, loud] = await Promise.all([
    getSetting(db, 'reminders_enabled'),
    getSetting(db, 'reminder_tone'),
    getSetting(db, 'reminder_loud'),
  ]);
  const next: ReminderPrefs = {
    enabled: enabled !== '0',
    tone: REMINDER_TONES.some((t) => t.key === tone) ? (tone as ReminderTone) : prefs.tone,
    loud: loud !== '0',
  };
  if (JSON.stringify(next) !== JSON.stringify(prefs)) {
    prefs = next;
    notify();
  }
}

export const getReminderPrefs = () => prefs;

/** Saves the change. Callers reschedule pending reminders (see taskActions.updateReminderPrefs). */
export async function storeReminderPrefs(patch: Partial<ReminderPrefs>): Promise<void> {
  prefs = { ...prefs, ...patch };
  notify();
  if (!db) return;
  await Promise.all([
    setSetting(db, 'reminders_enabled', prefs.enabled ? '1' : '0'),
    setSetting(db, 'reminder_tone', prefs.tone),
    setSetting(db, 'reminder_loud', prefs.loud ? '1' : '0'),
  ]);
}

export function useReminderPrefs(): ReminderPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => prefs,
  );
}
