import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createTask,
  deleteTask,
  deleteTasks,
  getTask,
  setTaskDone,
  setTaskNotificationId,
  updateTask,
} from '@/db/tasksRepo';
import type { Task, TaskInput } from '@/db/types';

import { cancelReminder, scheduleReminder, type ScheduleResult } from './reminders';

// Keeps the scheduled OS notification in step with the task row. Screens call these
// instead of the repo directly so a reminder never fires for a deleted/done task.

async function resync(db: SQLiteDatabase, task: Task): Promise<ScheduleResult | null> {
  await cancelReminder(task.notificationId);
  let result: ScheduleResult | null = null;
  let notificationId: string | null = null;
  if (task.kind === 'reminder' && !task.done) {
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
