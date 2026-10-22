import { usePreventRemove } from 'expo-router';
import { useEffect, useRef } from 'react';

import { confirmDestructive } from '@/lib/dialogs';

/**
 * Asks before leaving an editor with unsaved edits — via the header back arrow, the iOS
 * swipe-back gesture or the Android back button/gesture alike. Returns `allowLeave`, which
 * screens call right before navigating away on purpose (after saving or deleting).
 */
export function useUnsavedChangesGuard(dirty: boolean, what: string) {
  const allowRef = useRef<() => void>(() => {});
  const allowLeave = usePreventRemove(dirty, async ({ repeat }) => {
    const discard = await confirmDestructive(
      'Discard changes?',
      `Your changes to ${what} haven't been saved.`,
      'Discard',
    );
    if (discard) {
      allowRef.current();
      repeat();
    }
  });
  useEffect(() => {
    allowRef.current = allowLeave;
  }, [allowLeave]);
  return allowLeave;
}
