import type { SQLiteDatabase } from 'expo-sqlite';

import {
  clearAllNotificationIds,
  clearNotificationIds,
  createTask,
  deleteTask,
  deleteTasks,
  getTask,
  listPendingReminders,
  setTaskDone,
  setTaskNotificationId,
  updateTask,
} from '@/db/tasksRepo';
import { hasReminder, type Task, type TaskInput } from '@/db/types';

import { initReminderPrefs, storeReminderPrefs, type ReminderPrefs } from './reminderPrefs';
import {
  cancelAllReminders,
  cancelLegacyReminders,
  cancelReminder,
  scheduleReminder,
  type ScheduleResult,
} from './reminders';

// Keeps the scheduled OS notification in step with the task row. Screens call these
// instead of the repo directly so a reminder never fires for a deleted/done task.

async function resync(db: SQLiteDatabase, task: Task): Promise<ScheduleResult | null> {
  await cancelReminder(task.notificationId);
  let result: ScheduleResult | null = null;
  let notificationId: string | null = null;
  if (hasReminder(task) && !task.done) {
    result = await scheduleReminder(task);
    if ('id' in result) notificationId = result.id;
  }
  await setTaskNotificationId(db, task.id, notificationId);
  return result;
}

/** Creates or updates a task. Returns the scheduling outcome for reminders. */
export async function saveTask(
  db: SQLiteDatabase,
  id: number | null,
  input: TaskInput,
): Promise<ScheduleResult | null> {
  const taskId = id ?? (await createTask(db, input));
  if (id != null) await updateTask(db, id, input);
  const task = await getTask(db, taskId);
  return task ? resync(db, task) : null;
}

export async function toggleTaskDone(db: SQLiteDatabase, task: Task): Promise<void> {
  await setTaskDone(db, task.id, !task.done);
  const updated = await getTask(db, task.id);
  if (updated) await resync(db, updated);
}

export async function removeTask(db: SQLiteDatabase, task: Task): Promise<void> {
  await cancelReminder(task.notificationId);
  await deleteTask(db, task.id);
}

export async function removeTasks(db: SQLiteDatabase, tasks: Task[]): Promise<void> {
  await Promise.all(tasks.map((t) => cancelReminder(t.notificationId)));
  await deleteTasks(db, tasks.map((t) => t.id));
}

/**
 * Schedules any reminder that should be pending but isn't (e.g. tasks converted by a
 * migration, or saved while notifications were off). Safe to call on every app start.
 */
export async function syncPendingReminders(db: SQLiteDatabase): Promise<void> {
  await initReminderPrefs(db);
  // Move reminders scheduled with an earlier tone (or by an older version) onto the current one.
  const stale = await cancelLegacyReminders();
  if (stale.length) await clearNotificationIds(db, stale);
  for (const task of await listPendingReminders(db)) {
    const result = await scheduleReminder(task, { interactive: false });
    if ('id' in result) await setTaskNotificationId(db, task.id, result.id);
  }
}

/**
 * Saves a Settings change to reminders and reschedules every pending reminder with it
 * (Android ties the tone to the scheduled notification). Turning reminders off cancels them;
 * turning them back on schedules the ones still due.
 */
export async function updateReminderPrefs(
  db: SQLiteDatabase,
  patch: Partial<ReminderPrefs>,
): Promise<void> {
  await storeReminderPrefs(patch);
  await cancelAllReminders();
  await clearAllNotificationIds(db);
  await syncPendingReminders(db);
}
