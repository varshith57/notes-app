import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler } from 'react-native';

/** How long an item must be held to start multi-select. */
export const SELECT_HOLD_MS = 2000;

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

  return { selected, selecting, toggle, clear, selectAll };
}

export type Selection = ReturnType<typeof useSelection>;
