import { router, type Href } from 'expo-router';
import { Alert, Platform } from 'react-native';

// React Native's Alert is a no-op on web, which made validation messages and delete
// confirmations silently do nothing in the browser preview. These wrap Alert on
// native and the browser's own dialogs on web.

/** Shows a message; resolves when it's dismissed. */
export function showMessage(title: string, message?: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return Promise.resolve();
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }], {
      onDismiss: () => resolve(),
    }),
  );
}

/** Asks before a destructive action; resolves true only if the user confirms. */
export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel = 'Delete',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}

/**
 * Leaves an editor. Falls back to `fallback` when there's no screen to return to
 * (e.g. the editor was opened by URL or reloaded), where router.back() would do nothing.
 */
export function leaveTo(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
