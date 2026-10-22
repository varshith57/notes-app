import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * How long an item must be held to start multi-select. Standard long-press length: on a
 * real screen a finger drifts a few px while holding, and any drift past the touch slop
 * turns the press into a scroll — so multi-second holds rarely survive on phones.
 */
export const SELECT_HOLD_MS = 600;

/**
 * Multi-select state for a list. Holding an item starts selection; while selecting,
 * a tap toggles items instead of opening them.
 */
export function useSelection() {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Long-press handler: a short buzz confirms selection started, then toggles the item. */
  const begin = useCallback(
    (id: number) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      toggle(id);
    },
    [toggle],
  );

  const clear = useCallback(() => setSelected(new Set()), []);
  const selectAll = useCallback((ids: number[]) => setSelected(new Set(ids)), []);
  const selecting = selected.size > 0;

  // Android back button/gesture cancels the selection instead of leaving the screen.
  useFocusEffect(
    useCallback(() => {
      if (!selecting) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        clear();
        return true;
      });
      return () => sub.remove();
    }, [selecting, clear]),
  );

  return { selected, selecting, toggle, begin, clear, selectAll };
}

export type Selection = ReturnType<typeof useSelection>;
