import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { formatTime } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

import { Sheet } from './Sheet';

const pad = (n: number) => String(n).padStart(2, '0');

// Follow the device: show AM/PM only where the phone uses a 12-hour clock.
const USES_24H = !/[ap]\.?\s?m\.?/i.test(
  new Date(2024, 0, 1, 13, 0).toLocaleTimeString(undefined, { hour: 'numeric' }),
);

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);

const parse = (hhmm: string | null) => {
  if (!hhmm) {
    const d = new Date();
    return { h: (d.getHours() + 1) % 24, m: 0 };
  }
  const [h, m] = hhmm.split(':').map(Number);
  return { h, m };
};

/** Themed time picker in a bottom sheet. Value and result are HH:MM (24h). Mount it when
 *  opening so it starts from `value`. */
export function TimePickerSheet({
  visible,
  value,
  title = 'Select time',
  onDone,
  onCancel,
}: {
  visible: boolean;
  value: string | null;
  title?: string;
  onDone: (hhmm: string) => void;
  onCancel: () => void;
}) {
  const [{ h, m }, setTime] = useState(parse(value));

  const set = (hour: number, minute: number) =>
    setTime({ h: ((hour % 24) + 24) % 24, m: ((minute % 60) + 60) % 60 });
  const nudge = (delta: number) => {
    const total = (h * 60 + m + delta + 1440) % 1440;
    set(Math.floor(total / 60), total % 60);
  };

  const pm = h >= 12;
  const hhmm = `${pad(h)}:${pad(m)}`;

  return (
    <Sheet visible={visible} title={title} onCancel={onCancel} onDone={() => onDone(hhmm)}>
      <View style={styles.display}>
        <Pressable onPress={() => nudge(-1)} hitSlop={8} style={styles.nudge} accessibilityLabel="One minute earlier">
          <Feather name="minus" size={18} color={colors.primary} />
        </Pressable>
        <Text style={styles.time} accessibilityLiveRegion="polite">
          {formatTime(hhmm)}
        </Text>
        <Pressable onPress={() => nudge(1)} hitSlop={8} style={styles.nudge} accessibilityLabel="One minute later">
          <Feather name="plus" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {!USES_24H && (
        <View style={styles.ampm}>
          {(['AM', 'PM'] as const).map((p) => {
            const active = (p === 'PM') === pm;
            return (
              <Pressable
                key={p}
                onPress={() => !active && set(h + (p === 'PM' ? 12 : -12), m)}
                style={[styles.ampmItem, active && styles.active]}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.cellText, active && styles.activeText]}>{p}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.label}>HOUR</Text>
      <View style={styles.grid}>
        {(USES_24H ? HOURS_24 : HOURS_12).map((hour) => {
          // 12h grid: map the 1–12 button onto the current AM/PM half of the day.
          const value24 = USES_24H ? hour : (hour % 12) + (pm ? 12 : 0);
          const active = value24 === h;
          return (
            <Pressable
              key={hour}
              onPress={() => set(value24, m)}
              style={[styles.cell, active && styles.active]}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.cellText, active && styles.activeText]}>
                {USES_24H ? pad(hour) : hour}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>MINUTE</Text>
      <View style={styles.grid}>
        {MINUTES.map((minute) => {
          const active = minute === m;
          return (
            <Pressable
              key={minute}
              onPress={() => set(h, minute)}
              style={[styles.cell, active && styles.active]}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.cellText, active && styles.activeText]}>{pad(minute)}</Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  time: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    minWidth: 150,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  nudge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampm: { flexDirection: 'row', gap: 8 },
  ampmItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: colors.muted, marginBottom: -6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '14.6%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  cellText: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  active: { backgroundColor: colors.primary },
  activeText: { color: colors.onPrimary },
});
