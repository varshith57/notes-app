import type { SQLiteDatabase } from 'expo-sqlite';

import type { Direction } from './types';

export interface CustomSubcategory {
  id: number;
  name: string;
}

export async function listCustomSubcategories(
  db: SQLiteDatabase,
  direction: Direction,
  category: string,
): Promise<CustomSubcategory[]> {
  return db.getAllAsync<CustomSubcategory>(
    `SELECT id, name FROM custom_subcategories
     WHERE direction = ? AND category = ?
     ORDER BY name COLLATE NOCASE`,
    direction,
    category,
  );
}

/** Adds a subcategory; silently ignores a case-insensitive duplicate. */
export async function addCustomSubcategory(
  db: SQLiteDatabase,
  direction: Direction,
  category: string,
  name: string,
): Promise<void> {
  await db.runAsync(
    'INSERT OR IGNORE INTO custom_subcategories (direction, category, name) VALUES (?, ?, ?)',
    direction,
    category,
    name,
  );
}

/** Existing transactions keep the text label; only the picker option is removed. */
export async function deleteCustomSubcategory(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM custom_subcategories WHERE id = ?', id);
}
