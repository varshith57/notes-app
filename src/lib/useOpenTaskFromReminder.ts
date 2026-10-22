import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

/**
 * Opens the task when the user taps its reminder notification — whether the app was in
 * the background or fully closed. Call once from the root layout.
 */
export function useOpenTaskFromReminder() {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const requestId = response.notification.request.identifier;
    const taskId = response.notification.request.content.data?.taskId;
    if (handled.current === requestId || typeof taskId !== 'number') return;
    handled.current = requestId;
    router.push({ pathname: '/task/[id]', params: { id: taskId } });
  }, [response]);
}
