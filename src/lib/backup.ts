import type { SQLiteDatabase } from 'expo-sqlite';

/** User-data tables included in a backup (app_settings is device state, not backed up). */
export const BACKUP_TABLES = ['notes', 'transactions', 'custom_subcategories', 'tasks'] as const;
type Table = (typeof BACKUP_TABLES)[number];

export interface Snapshot {
  format: 1;
  /** PRAGMA user_version of the database that produced it. */
  schema: number;
  exportedAt: string;
  tables: Record<Table, Record<string, unknown>[]>;
}

async function schemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/** Every row of every user-data table, as plain JSON. */
export async function exportSnapshot(db: SQLiteDatabase): Promise<Snapshot> {
  const tables = {} as Snapshot['tables'];
  for (const t of BACKUP_TABLES) tables[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  return { format: 1, schema: await schemaVersion(db), exportedAt: new Date().toISOString(), tables };
}

export async function hasAnyUserData(db: SQLiteDatabase): Promise<boolean> {
  for (const t of BACKUP_TABLES) {
    if (t === 'custom_subcategories') continue;
    if (await db.getFirstAsync(`SELECT 1 FROM ${t} LIMIT 1`)) return true;
  }
  return false;
}

export class BackupTooNewError extends Error {
  constructor() {
    super('This backup was made by a newer version of the app. Update the app, then restore.');
  }
}

/**
 * Replaces all user data with the snapshot, in one transaction (all or nothing).
 * Columns are matched by name, so older backups still import into a newer schema.
 * Scheduled reminders are the caller's job (ids in the snapshot belong to another install).
 */
export async function importSnapshot(db: SQLiteDatabase, snap: Snapshot): Promise<void> {
  if (snap.format !== 1 || typeof snap.tables !== 'object') throw new Error('Not a My Notes backup.');
  if (snap.schema > (await schemaVersion(db))) throw new BackupTooNewError();

  await db.withTransactionAsync(async () => {
    for (const t of BACKUP_TABLES) {
      const columns = new Set(
        (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name),
      );
      await db.runAsync(`DELETE FROM ${t}`);
      for (const row of snap.tables[t] ?? []) {
        const keys = Object.keys(row).filter((k) => columns.has(k));
        if (!keys.length) continue;
        await db.runAsync(
          `INSERT INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          ...keys.map((k) => row[k] as string | number | null),
        );
      }
    }
    // Notification ids from the backed-up install mean nothing here.
    await db.runAsync('UPDATE tasks SET notification_id = NULL');
  });
}
