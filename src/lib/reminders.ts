import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Task } from '@/db/types';

import { fromISODate } from './format';

const CHANNEL_ID = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ won't show the permission prompt until a channel exists.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function reminderDate(task: Pick<Task, 'dueOn' | 'dueTime'>): Date | null {
  if (!task.dueOn || !task.dueTime) return null;
  const date = fromISODate(task.dueOn);
  const [h, m] = task.dueTime.split(':').map(Number);
  date.setHours(h, m, 0, 0);
  return date;
}

export type ScheduleResult = { id: string } | { error: 'past' | 'denied' };

/** Schedules a one-off local notification at the task's date and time. */
export async function scheduleReminder(task: Task): Promise<ScheduleResult> {
  const date = reminderDate(task);
  if (!date || date.getTime() <= Date.now()) return { error: 'past' };
  if (!(await ensurePermission())) return { error: 'denied' };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: task.title,
      body: task.details || 'Reminder',
      data: { taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: CHANNEL_ID,
    },
  });
  return { id };
}

export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId);
}
