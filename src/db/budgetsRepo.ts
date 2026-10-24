import type { SQLiteDatabase } from 'expo-sqlite';

import type { DateRange } from '@/lib/periods';

import type { Budget, BudgetInput, BudgetStatus } from './types';

interface BudgetRow {
  id: number;
  category: string;
  subcategory: string | null;
  amount_cents: number;
  start_on: string;
  end_on: string;
  spent?: number | null;
}

const toBudget = (row: BudgetRow): Budget => ({
  id: row.id,
  category: row.category,
  subcategory: row.subcategory,
  amountCents: row.amount_cents,
  startOn: row.start_on,
  endOn: row.end_on,
});

/**
 * Budgets whose date range overlaps `range`, each with its spending so far: expenses in
 * its category (and subcategory, if set) dated within the budget's own range.
 */
export async function listBudgetStatuses(
  db: SQLiteDatabase,
  range: DateRange,
): Promise<BudgetStatus[]> {
  const rows = await db.getAllAsync<BudgetRow>(
    `SELECT b.*, (
       SELECT COALESCE(SUM(t.amount_cents), 0) FROM transactions t
       WHERE t.direction = 'expense' AND t.category = b.category
         AND (b.subcategory IS NULL OR t.subcategory = b.subcategory)
         AND t.occurred_on BETWEEN b.start_on AND b.end_on
     ) AS spent
     FROM budgets b
     WHERE b.start_on <= ? AND b.end_on >= ?
     ORDER BY b.category, b.subcategory IS NOT NULL, b.subcategory, b.start_on`,
    range.to,
    range.from,
  );
  return rows.map((row) => ({ ...toBudget(row), spentCents: row.spent ?? 0 }));
}

export async function getBudget(db: SQLiteDatabase, id: number): Promise<Budget | null> {
  const row = await db.getFirstAsync<BudgetRow>('SELECT * FROM budgets WHERE id = ?', id);
  return row ? toBudget(row) : null;
}

export async function createBudget(db: SQLiteDatabase, input: BudgetInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO budgets (category, subcategory, amount_cents, start_on, end_on)
     VALUES (?, ?, ?, ?, ?)`,
    input.category,
    input.subcategory,
    input.amountCents,
    input.startOn,
    input.endOn,
  );
  return result.lastInsertRowId;
}

export async function updateBudget(db: SQLiteDatabase, id: number, input: BudgetInput): Promise<void> {
  await db.runAsync(
    `UPDATE budgets
     SET category = ?, subcategory = ?, amount_cents = ?, start_on = ?, end_on = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    input.category,
    input.subcategory,
    input.amountCents,
    input.startOn,
    input.endOn,
    id,
  );
}

export async function deleteBudget(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM budgets WHERE id = ?', id);
}

/**
 * The budget a transaction counts against: one for its exact subcategory if there is one,
 * otherwise one for its whole category, covering the transaction's date.
 */
export function budgetForTransaction(
  budgets: BudgetStatus[],
  tx: { direction: string; category: string; subcategory: string | null; occurredOn: string },
): BudgetStatus | null {
  if (tx.direction !== 'expense') return null;
  const covering = budgets.filter(
    (b) => b.category === tx.category && b.startOn <= tx.occurredOn && b.endOn >= tx.occurredOn,
  );
  return (
    covering.find((b) => b.subcategory != null && b.subcategory === tx.subcategory) ??
    covering.find((b) => b.subcategory == null) ??
    null
  );
}
