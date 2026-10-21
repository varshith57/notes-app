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
 * - todo: a checklist item, optionally dated.
 * - agenda: a time-blocked item on a specific day (start/end time).
 * - reminder: a dated, timed item that fires a local notification.
 */
export type TaskKind = 'todo' | 'agenda' | 'reminder';

export interface Task {
  id: number;
  kind: TaskKind;
  title: string;
  details: string;
  /** YYYY-MM-DD */
  dueOn: string | null;
  /** HH:MM, 24h */
  dueTime: string | null;
  /** HH:MM, agenda items only */
  endTime: string | null;
  priority: Priority;
  done: boolean;
  completedAt: string | null;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskInput = Pick<
  Task,
  'kind' | 'title' | 'details' | 'dueOn' | 'dueTime' | 'endTime' | 'priority'
>;
