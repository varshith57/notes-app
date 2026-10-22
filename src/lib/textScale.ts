import type { SQLiteDatabase } from 'expo-sqlite';
import { useSyncExternalStore } from 'react';

import { getSetting, setSetting } from '@/db/settingsRepo';

// App-level text size for reading/writing content (note text, task and entry titles),
// on top of the phone's own font-size setting. Chosen with A− / A+ in Settings.
export const TEXT_SCALES = [0.85, 1, 1.15, 1.3, 1.5] as const;
const DEFAULT_INDEX = 1;

let index = DEFAULT_INDEX;
let db: SQLiteDatabase | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export async function initTextScale(database: SQLiteDatabase): Promise<void> {
  db = database;
  const saved = Number(await getSetting(db, 'text_scale'));
  const i = TEXT_SCALES.indexOf(saved as (typeof TEXT_SCALES)[number]);
  if (i >= 0 && i !== index) {
    index = i;
    notify();
  }
}

/** Steps the text size up (+1) or down (−1); returns false at either end. */
export function stepTextScale(delta: 1 | -1): boolean {
  const next = index + delta;
  if (next < 0 || next >= TEXT_SCALES.length) return false;
  index = next;
  notify();
  if (db) setSetting(db, 'text_scale', String(TEXT_SCALES[index])).catch(() => {});
  return true;
}

export const textScaleIndex = () => index;

/** Current multiplier; components re-render when it changes. */
export function useTextScale(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => TEXT_SCALES[index],
  );
}

/** Font size scaled by the current setting, rounded to whole points. */
export const scaled = (size: number, scale: number) => Math.round(size * scale);
