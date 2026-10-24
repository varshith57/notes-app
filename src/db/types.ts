import type { NoteColor } from '@/lib/theme';

export interface Note {
  id: number;
  title: string;
  /** Unlimited length — SQLite TEXT has no practical cap for notes. */
  body: string;
  color: NoteColor;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NoteInput = Pick<Note, 'title' | 'body' | 'color' | 'pinned'>;

export type Direction = 'income' | 'expense';

export interface Transaction {
  id: number;
  direction: Direction;
  /** Integer cents to avoid floating-point drift. */
  amountCents: number;
  category: string;
  subcategory: string | null;
  /** YYYY-MM-DD */
  occurredOn: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

export interface FinanceSummary {
  incomeCents: number;
  expenseCents: number;
}

export type Priority = 'low' | 'medium' | 'high';

/**
 * One task shows up in every view it belongs to: To-do lists them all, Agenda shows those
 * dated on the selected day, Reminders shows those that will notify you.
 */
export interface Task {
  id: number;
  title: string;
  details: string;
  /** YYYY-MM-DD */
  dueOn: string | null;
  /** HH:MM, 24h */
  dueTime: string | null;
  /** HH:MM, optional end for a time block */
  endTime: string | null;
  /** Notify at dueOn + dueTime (only takes effect when both are set). */
  remind: boolean;
  priority: Priority;
  done: boolean;
  completedAt: string | null;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskInput = Pick<
  Task,
  'title' | 'details' | 'dueOn' | 'dueTime' | 'endTime' | 'remind' | 'priority'
>;

/** A task will notify when it's switched on and has both a date and a time. */
export const hasReminder = (t: Pick<Task, 'remind' | 'dueOn' | 'dueTime'>) =>
  t.remind && t.dueOn != null && t.dueTime != null;

/** A spending limit for an expense category (or one of its subcategories) over a date range. */
export interface Budget {
  id: number;
  category: string;
  /** null: the whole category. */
  subcategory: string | null;
  amountCents: number;
  /** YYYY-MM-DD, inclusive. */
  startOn: string;
  endOn: string;
}

export type BudgetInput = Omit<Budget, 'id'>;

/** A budget with what's been spent against it within its own date range. */
export interface BudgetStatus extends Budget {
  spentCents: number;
}

/** Remaining amount (negative when over budget). */
export const budgetLeft = (b: BudgetStatus) => b.amountCents - b.spentCents;

export interface CategoryTotal {
  category: string;
  totalCents: number;
}
