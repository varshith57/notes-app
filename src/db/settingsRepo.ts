import type { SQLiteDatabase } from 'expo-sqlite';

/** App state that isn't user data (and isn't backed up). */
export type SettingKey =
  | 'onboarding_done'
  | 'backup_email'
  | 'backup_auto'
  | 'last_backup_at'
  | 'last_backup_error'
  | 'text_scale';

export async function getSetting(db: SQLiteDatabase, key: SettingKey): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(
  db: SQLiteDatabase,
  key: SettingKey,
  value: string | null,
): Promise<void> {
  if (value == null) {
    await db.runAsync('DELETE FROM app_settings WHERE key = ?', key);
  } else {
    await db.runAsync(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      value,
    );
  }
}
