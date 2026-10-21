import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'notes.db';

const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

/**
 * Each entry upgrades the schema by one version. Never edit a migration once the app
 * has shipped — users already have it applied. Append a new one instead.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    title      TEXT    NOT NULL DEFAULT '',
    body       TEXT    NOT NULL DEFAULT '',
    color      TEXT    NOT NULL DEFAULT 'lavender',
    pinned     INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT ${NOW},
    updated_at TEXT    NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX idx_notes_updated ON notes (pinned DESC, updated_at DESC);

  CREATE TABLE transactions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    direction    TEXT    NOT NULL CHECK (direction IN ('income', 'expense')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    category     TEXT    NOT NULL,
    subcategory  TEXT,
    occurred_on  TEXT    NOT NULL,
    note         TEXT    NOT NULL DEFAULT '',
    created_at   TEXT    NOT NULL DEFAULT ${NOW},
    updated_at   TEXT    NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX idx_transactions_occurred ON transactions (occurred_on DESC, id DESC);

  -- User-defined subcategories, added on top of the built-in ones in src/lib/categories.ts.
  CREATE TABLE custom_subcategories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    direction  TEXT    NOT NULL CHECK (direction IN ('income', 'expense')),
    category   TEXT    NOT NULL,
    name       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT ${NOW},
    UNIQUE (direction, category, name COLLATE NOCASE)
  );

  CREATE TABLE tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    kind            TEXT    NOT NULL DEFAULT 'todo' CHECK (kind IN ('todo', 'agenda', 'reminder')),
    title           TEXT    NOT NULL,
    details         TEXT    NOT NULL DEFAULT '',
    due_on          TEXT,
    due_time        TEXT,
    end_time        TEXT,
    priority        TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    done            INTEGER NOT NULL DEFAULT 0,
    completed_at    TEXT,
    notification_id TEXT,
    created_at      TEXT    NOT NULL DEFAULT ${NOW},
    updated_at      TEXT    NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX idx_tasks_kind_due ON tasks (kind, done, due_on, due_time);
  `,
  // v2: note colours moved from pastels to the app palette.
  `
  UPDATE notes SET color = CASE color
    WHEN 'lavender' THEN 'cream'
    WHEN 'sunny'    THEN 'gold'
    WHEN 'sky'      THEN 'grey'
    WHEN 'rose'     THEN 'burgundy'
    WHEN 'mint'     THEN 'black'
    ELSE color
  END;
  `,
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
