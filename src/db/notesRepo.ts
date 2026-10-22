import type { SQLiteDatabase } from 'expo-sqlite';

import type { NoteColor } from '@/lib/theme';

import type { Note, NoteInput } from './types';

interface NoteRow {
  id: number;
  title: string;
  body: string;
  color: NoteColor;
  pinned: number;
  created_at: string;
  updated_at: string;
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    color: row.color,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Notes matching `search` (title or body) and, if given, one colour. Pinned first. */
export async function listNotes(
  db: SQLiteDatabase,
  search = '',
  limit = -1,
  color: NoteColor | null = null,
): Promise<Note[]> {
  const like = `%${search.trim()}%`;
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes
     WHERE (title LIKE ? OR body LIKE ?) AND (? IS NULL OR color = ?)
     ORDER BY pinned DESC, updated_at DESC
     LIMIT ?`,
    like,
    like,
    color,
    color,
    limit,
  );
  return rows.map(toNote);
}

export async function countNotes(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM notes');
  return row?.n ?? 0;
}

export async function getNote(db: SQLiteDatabase, id: number): Promise<Note | null> {
  const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', id);
  return row ? toNote(row) : null;
}

export async function createNote(db: SQLiteDatabase, input: NoteInput): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO notes (title, body, color, pinned) VALUES (?, ?, ?, ?)',
    input.title,
    input.body,
    input.color,
    input.pinned ? 1 : 0,
  );
  return result.lastInsertRowId;
}

export async function updateNote(db: SQLiteDatabase, id: number, input: NoteInput): Promise<void> {
  await db.runAsync(
    `UPDATE notes
     SET title = ?, body = ?, color = ?, pinned = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    input.title,
    input.body,
    input.color,
    input.pinned ? 1 : 0,
    id,
  );
}

export async function deleteNote(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', id);
}

export async function deleteNotes(db: SQLiteDatabase, ids: number[]): Promise<void> {
  if (!ids.length) return;
  await db.runAsync(`DELETE FROM notes WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
}
