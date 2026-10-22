import * as Notifications from 'expo-notifications';
import {
  AndroidAudioContentType,
  AndroidAudioUsage,
  AndroidImportance,
  AndroidNotificationPriority,
  AndroidNotificationVisibility,
} from 'expo-notifications';
import { Platform } from 'react-native';

import type { Task } from '@/db/types';

import { showMessage } from './dialogs';
import { fromISODate } from './format';

// Reminders behave like an alarm: alarm volume (rings even when the phone is on silent),
// a 28 s alarm tone, long vibration, shown on the lock screen, delivered through the
// system alarm clock so Android doesn't defer it. Android channel settings can't be
// changed after creation, so the alarm behaviour lives on a new channel id.
const CHANNEL_ID = 'reminder-alarms';
const LEGACY_CHANNEL_IDS = ['reminders'];
const ALARM_SOUND = 'alarm.wav'; // assets/sounds/alarm.wav, bundled via the expo-notifications plugin

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAlarmChannel() {
  // Android 13+ won't show the notification permission prompt until a channel exists.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders (alarm)',
    description: 'Rings like an alarm when a task is due.',
    importance: AndroidImportance.MAX,
    sound: ALARM_SOUND,
    audioAttributes: {
      usage: AndroidAudioUsage.ALARM,
      contentType: AndroidAudioContentType.SONIFICATION,
    },
    vibrationPattern: [0, 800, 400, 800, 400, 800, 400, 800],
    enableVibrate: true,
    bypassDnd: true,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
  for (const id of LEGACY_CHANNEL_IDS) await Notifications.deleteNotificationChannelAsync(id);
}

let askedForExactAlarms = false;

/**
 * Android 12+: reminders only ring at the exact minute with "Alarms & reminders" access
 * (Android 14+ has it off by default). Explain and open the setting once per app run;
 * without it they still fire, just possibly a few minutes late.
 */
async function ensureExactAlarms() {
  if (askedForExactAlarms) return;
  const current = await Notifications.getExactAlarmPermissionsAsync();
  if (current.granted) return;
  askedForExactAlarms = true;
  await showMessage(
    'Let reminders ring on time',
    'On the next screen, turn on “Alarms & reminders” for My Notes so your reminders ring exactly when they’re due.',
  );
  await Notifications.requestExactAlarmPermissionsAsync().catch(() => {});
}

/** `interactive: false` (background re-sync) never prompts; it uses what's already granted. */
async function ensurePermission(interactive: boolean): Promise<boolean> {
  if (Platform.OS === 'android') await ensureAlarmChannel();
  const current = await Notifications.getPermissionsAsync();
  if (!interactive) return current.granted;
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (granted && Platform.OS === 'android') await ensureExactAlarms();
  return granted;
}

export function reminderDate(task: Pick<Task, 'dueOn' | 'dueTime'>): Date | null {
  if (!task.dueOn || !task.dueTime) return null;
  const date = fromISODate(task.dueOn);
  const [h, m] = task.dueTime.split(':').map(Number);
  date.setHours(h, m, 0, 0);
  return date;
}

export type ScheduleError = 'past' | 'denied' | 'unsupported';
export type ScheduleResult = { id: string } | { error: ScheduleError };

/** Schedules a one-off local notification at the task's date and time. */
export async function scheduleReminder(
  task: Task,
  { interactive = true }: { interactive?: boolean } = {},
): Promise<ScheduleResult> {
  // expo-notifications can't schedule local notifications in a browser.
  if (Platform.OS === 'web') return { error: 'unsupported' };
  const date = reminderDate(task);
  if (!date || date.getTime() <= Date.now()) return { error: 'past' };
  if (!(await ensurePermission(interactive))) return { error: 'denied' };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ ${task.title}`,
      body: task.details || 'Reminder',
      data: { taskId: task.id },
      sound: ALARM_SOUND,
      priority: AndroidNotificationPriority.MAX,
      // Stays until you tap it (can't be swiped away by accident), like an alarm.
      sticky: true,
      // iOS: breaks through Focus modes.
      interruptionLevel: 'timeSensitive',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      // System alarm clock: never deferred for battery saving (needs "Alarms & reminders").
      delivery: 'alarmClock',
      channelId: CHANNEL_ID,
    },
  });
  return { id };
}

export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (notificationId && Platform.OS !== 'web') {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}


/**
 * IDs of scheduled reminders still on an old (non-alarm) channel. The caller cancels them
 * and reschedules so existing reminders ring like an alarm too.
 */
export async function cancelLegacyReminders(): Promise<string[]> {
  if (Platform.OS !== 'android') return [];
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const stale = scheduled
    .filter((n) => {
      const trigger = n.trigger as { channelId?: string } | null;
      return trigger?.channelId != null && trigger.channelId !== CHANNEL_ID;
    })
    .map((n) => n.identifier);
  await Promise.all(stale.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  return stale;
}

/** Cancels every scheduled reminder (used before restoring a backup). */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS !== 'web') await Notifications.cancelAllScheduledNotificationsAsync();
}
