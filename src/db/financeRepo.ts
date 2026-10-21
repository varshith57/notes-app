import type { SQLiteDatabase } from 'expo-sqlite';

import type { DateRange } from '@/lib/periods';

import type { Direction, FinanceSummary, Transaction, TransactionInput } from './types';

interface TransactionRow {
  id: number;
  direction: Direction;
  amount_cents: number;
  category: string;
  subcategory: string | null;
  occurred_on: string;
  note: string;
  created_at: string;
  updated_at: string;
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    direction: row.direction,
    amountCents: row.amount_cents,
    category: row.category,
    subcategory: row.subcategory,
    occurredOn: row.occurred_on,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Transactions dated within `range` (inclusive), newest first. */
export async function listTransactions(
  db: SQLiteDatabase,
  range: DateRange,
  direction?: Direction,
): Promise<Transaction[]> {
  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions
     WHERE occurred_on BETWEEN ? AND ? AND (? IS NULL OR direction = ?)
     ORDER BY occurred_on DESC, id DESC`,
    range.from,
    range.to,
    direction ?? null,
    direction ?? null,
  );
  return rows.map(toTransaction);
}

export async function getTransaction(db: SQLiteDatabase, id: number): Promise<Transaction | null> {
  const row = await db.getFirstAsync<TransactionRow>(
    'SELECT * FROM transactions WHERE id = ?',
    id,
  );
  return row ? toTransaction(row) : null;
}

export async function createTransaction(
  db: SQLiteDatabase,
  input: TransactionInput,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO transactions (direction, amount_cents, category, subcategory, occurred_on, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.direction,
    input.amountCents,
    input.category,
    input.subcategory,
    input.occurredOn,
    input.note,
  );
  return result.lastInsertRowId;
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: number,
  input: TransactionInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE transactions
     SET direction = ?, amount_cents = ?, category = ?, subcategory = ?, occurred_on = ?, note = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    input.direction,
    input.amountCents,
    input.category,
    input.subcategory,
    input.occurredOn,
    input.note,
    id,
  );
}

export async function deleteTransaction(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}

export async function deleteTransactions(db: SQLiteDatabase, ids: number[]): Promise<void> {
  if (!ids.length) return;
  await db.runAsync(
    `DELETE FROM transactions WHERE id IN (${ids.map(() => '?').join(',')})`,
    ...ids,
  );
}

/** Date (YYYY-MM-DD) of the oldest transaction, or null if there are none. Bounds history browsing. */
export async function getEarliestDate(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ first: string | null }>(
    'SELECT MIN(occurred_on) AS first FROM transactions',
  );
  return row?.first ?? null;
}

export async function getFinanceSummary(
  db: SQLiteDatabase,
  range: DateRange,
): Promise<FinanceSummary> {
  const row = await db.getFirstAsync<{ income: number | null; expense: number | null }>(
    `SELECT
       SUM(CASE WHEN direction = 'income'  THEN amount_cents END) AS income,
       SUM(CASE WHEN direction = 'expense' THEN amount_cents END) AS expense
     FROM transactions
     WHERE occurred_on BETWEEN ? AND ?`,
    range.from,
    range.to,
  );
  return { incomeCents: row?.income ?? 0, expenseCents: row?.expense ?? 0 };
}
