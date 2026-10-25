import { usePreventRemove, type Href } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { confirmDestructive, leaveTo } from '@/lib/dialogs';

/**
 * Asks before leaving an editor with unsaved edits — via the header back arrow, the iOS
 * swipe-back gesture or the Android back button/gesture alike. Returns `leave`, which
 * screens call to navigate away on purpose (after saving or deleting).
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

  // Lifting the guard re-renders the screen and updates its native header. Navigating in the
  // same frame lets Android remove the header while that update is still being applied,
  // which crashes ("The specified child already has a parent"), so wait two frames first.
  return useCallback((fallback: Href) => {
    allowRef.current();
    requestAnimationFrame(() => requestAnimationFrame(() => leaveTo(fallback)));
  }, []);
}
