import type { SQLiteDatabase } from 'expo-sqlite';

import type { Priority, Task, TaskInput } from './types';

interface TaskRow {
  id: number;
  title: string;
  details: string;
  due_on: string | null;
  due_time: string | null;
  end_time: string | null;
  remind: number;
  priority: Priority;
  done: number;
  completed_at: string | null;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    details: row.details,
    dueOn: row.due_on,
    dueTime: row.due_time,
    endTime: row.end_time,
    remind: row.remind === 1,
    priority: row.priority,
    done: row.done === 1,
    completedAt: row.completed_at,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ORDER = `
  ORDER BY done ASC,
           due_on IS NULL, due_on ASC,
           due_time IS NULL, due_time ASC,
           CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
           id DESC`;

/** Every task (the master checklist): open ones first by due date/time, then priority. */
export async function listTodos(db: SQLiteDatabase, showDone: boolean): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks WHERE (? = 1 OR done = 0) ${ORDER}`,
    showDone ? 1 : 0,
  );
  return rows.map(toTask);
}

/** Everything dated on a given day, in time order (untimed items last). */
export async function listForDay(db: SQLiteDatabase, day: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks WHERE due_on = ?
     ORDER BY due_time IS NULL, due_time ASC, id ASC`,
    day,
  );
  return rows.map(toTask);
}

/** Days in [from, to] that have at least one item, for the calendar strip dots. */
export async function listBusyDays(db: SQLiteDatabase, from: string, to: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ due_on: string }>(
    'SELECT DISTINCT due_on FROM tasks WHERE due_on BETWEEN ? AND ?',
    from,
    to,
  );
  return rows.map((r) => r.due_on);
}

/** Tasks that will notify you: reminder on, with a date and a time. */
export async function listReminders(db: SQLiteDatabase, showDone: boolean): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     WHERE remind = 1 AND due_on IS NOT NULL AND due_time IS NOT NULL AND (? = 1 OR done = 0)
     ${ORDER}`,
    showDone ? 1 : 0,
  );
  return rows.map(toTask);
}

export async function listUpcoming(db: SQLiteDatabase, from: string, limit: number): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks WHERE done = 0 AND (due_on IS NULL OR due_on >= ?) ${ORDER} LIMIT ?`,
    from,
    limit,
  );
  return rows.map(toTask);
}

export async function getTaskStats(
  db: SQLiteDatabase,
  day: string,
): Promise<{ done: number; total: number }> {
  const row = await db.getFirstAsync<{ done: number | null; total: number }>(
    `SELECT SUM(done) AS done, COUNT(*) AS total FROM tasks
     WHERE due_on = ? OR due_on IS NULL`,
    day,
  );
  return { done: row?.done ?? 0, total: row?.total ?? 0 };
}

export async function getTask(db: SQLiteDatabase, id: number): Promise<Task | null> {
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', id);
  return row ? toTask(row) : null;
}

export async function createTask(db: SQLiteDatabase, input: TaskInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO tasks (title, details, due_on, due_time, end_time, remind, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.details,
    input.dueOn,
    input.dueTime,
    input.endTime,
    input.remind ? 1 : 0,
    input.priority,
  );
  return result.lastInsertRowId;
}

export async function updateTask(db: SQLiteDatabase, id: number, input: TaskInput): Promise<void> {
  await db.runAsync(
    `UPDATE tasks
     SET title = ?, details = ?, due_on = ?, due_time = ?, end_time = ?, remind = ?, priority = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    input.title,
    input.details,
    input.dueOn,
    input.dueTime,
    input.endTime,
    input.remind ? 1 : 0,
    input.priority,
    id,
  );
}

/** Open tasks that should have a pending notification, for re-scheduling on app start. */
export async function listPendingReminders(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     WHERE done = 0 AND remind = 1 AND due_on IS NOT NULL AND due_time IS NOT NULL
       AND notification_id IS NULL`,
  );
  return rows.map(toTask);
}

/** Forget notification ids (e.g. after cancelling them) so they get rescheduled. */
export async function clearNotificationIds(db: SQLiteDatabase, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await db.runAsync(
    `UPDATE tasks SET notification_id = NULL WHERE notification_id IN (${ids.map(() => '?').join(',')})`,
    ...ids,
  );
}

export async function setTaskNotificationId(
  db: SQLiteDatabase,
  id: number,
  notificationId: string | null,
): Promise<void> {
  await db.runAsync('UPDATE tasks SET notification_id = ? WHERE id = ?', notificationId, id);
}

/** Forgets every scheduled reminder id (after cancelling them all). */
export async function clearAllNotificationIds(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('UPDATE tasks SET notification_id = NULL');
}

export async function setTaskDone(db: SQLiteDatabase, id: number, done: boolean): Promise<void> {
  await db.runAsync(
    `UPDATE tasks
     SET done = ?,
         completed_at = CASE WHEN ? = 1 THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') END,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    done ? 1 : 0,
    done ? 1 : 0,
    id,
  );
}

export async function deleteTask(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}

export async function deleteTasks(db: SQLiteDatabase, ids: number[]): Promise<void> {
  if (!ids.length) return;
  await db.runAsync(`DELETE FROM tasks WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
}
