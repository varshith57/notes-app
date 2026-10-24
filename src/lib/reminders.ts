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
import { getReminderPrefs, REMINDER_TONES, type ReminderPrefs, type ReminderTone } from './reminderPrefs';

// Reminders use the tone and loudness chosen in Settings (lib/reminderPrefs). By default
// they behave like an alarm: alarm volume (rings even when the phone is on silent), shown
// on the lock screen, delivered through the system alarm clock so Android doesn't defer it.
// Android fixes a channel's sound when it's created, so each tone/loudness combination gets
// its own channel id and switching deletes the others.
const CHANNEL_PREFIX = 'reminders-';
const LEGACY_CHANNEL_IDS = ['reminders', 'reminder-alarms'];

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

const channelId = ({ tone, loud }: ReminderPrefs) =>
  `${CHANNEL_PREFIX}${tone}-${loud ? 'alarm' : 'normal'}`;

const toneFile = (tone: ReminderTone) => REMINDER_TONES.find((t) => t.key === tone)?.file ?? null;

async function ensureChannel(prefs: ReminderPrefs): Promise<string> {
  const id = channelId(prefs);
  const file = toneFile(prefs.tone);
  // Android 13+ won't show the notification permission prompt until a channel exists.
  await Notifications.setNotificationChannelAsync(id, {
    name: `Reminders (${REMINDER_TONES.find((t) => t.key === prefs.tone)?.label})`,
    description: prefs.loud
      ? 'Rings at alarm volume when a task is due, even on silent.'
      : 'Notifies you when a task is due.',
    importance: prefs.loud ? AndroidImportance.MAX : AndroidImportance.HIGH,
    // Leaving `sound` out plays the phone's notification sound; null means vibrate only.
    ...(prefs.tone === 'system' ? {} : { sound: file }),
    audioAttributes: {
      usage: prefs.loud ? AndroidAudioUsage.ALARM : AndroidAudioUsage.NOTIFICATION,
      contentType: AndroidAudioContentType.SONIFICATION,
    },
    vibrationPattern: [0, 800, 400, 800, 400, 800, 400, 800],
    enableVibrate: true,
    bypassDnd: prefs.loud,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
  const existing = (await Notifications.getNotificationChannelsAsync()) ?? [];
  for (const channel of existing) {
    const ours = channel.id.startsWith(CHANNEL_PREFIX) || LEGACY_CHANNEL_IDS.includes(channel.id);
    if (ours && channel.id !== id) {
      await Notifications.deleteNotificationChannelAsync(channel.id);
    }
  }
  return id;
}

/** iOS plays the sound named in each notification (Android uses the channel's). */
function contentSound(tone: ReminderTone): string | boolean {
  if (tone === 'silent') return false;
  return toneFile(tone) ?? true;
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
  if (Platform.OS === 'android') await ensureChannel(getReminderPrefs());
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

export type ScheduleError = 'past' | 'denied' | 'unsupported' | 'disabled';
export type ScheduleResult = { id: string } | { error: ScheduleError };

/** Schedules a one-off local notification at the task's date and time. */
export async function scheduleReminder(
  task: Task,
  { interactive = true }: { interactive?: boolean } = {},
): Promise<ScheduleResult> {
  // expo-notifications can't schedule local notifications in a browser.
  if (Platform.OS === 'web') return { error: 'unsupported' };
  const prefs = getReminderPrefs();
  if (!prefs.enabled) return { error: 'disabled' };
  const date = reminderDate(task);
  if (!date || date.getTime() <= Date.now()) return { error: 'past' };
  if (!(await ensurePermission(interactive))) return { error: 'denied' };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ ${task.title}`,
      body: task.details || 'Reminder',
      data: { taskId: task.id },
      sound: contentSound(prefs.tone),
      priority: prefs.loud ? AndroidNotificationPriority.MAX : AndroidNotificationPriority.HIGH,
      // iOS: breaks through Focus modes.
      interruptionLevel: 'timeSensitive',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      // Alarm style goes through the system alarm clock: never deferred for battery saving
      // (needs "Alarms & reminders"), and shows as the next alarm on the lock screen.
      ...(prefs.loud ? { delivery: 'alarmClock' as const } : {}),
      channelId: channelId(prefs),
    },
  });
  return { id };
}

/** Rings a sample reminder in a few seconds, with the current tone, from Settings. */
export async function sendTestReminder(): Promise<ScheduleError | null> {
  if (Platform.OS === 'web') return 'unsupported';
  const prefs = getReminderPrefs();
  if (!(await ensurePermission(true))) return 'denied';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Test reminder',
      body: 'This is how your reminders will sound.',
      sound: contentSound(prefs.tone),
      priority: AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: channelId(prefs),
    },
  });
  return null;
}

/** Cancels a pending reminder and clears it from the notification shade if it already rang. */
export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (notificationId && Platform.OS !== 'web') {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
  }
}


/**
 * IDs of scheduled reminders on a channel other than the current tone's (scheduled before
 * the tone changed, or by an older version). The caller reschedules them on the current one.
 */
export async function cancelLegacyReminders(): Promise<string[]> {
  if (Platform.OS !== 'android') return [];
  const current = channelId(getReminderPrefs());
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const stale = scheduled
    .filter((n) => {
      const trigger = n.trigger as { channelId?: string } | null;
      return trigger?.channelId != null && trigger.channelId !== current;
    })
    .map((n) => n.identifier);
  await Promise.all(stale.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  return stale;
}

/** Cancels every scheduled reminder (used before restoring a backup). */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS !== 'web') await Notifications.cancelAllScheduledNotificationsAsync();
}
