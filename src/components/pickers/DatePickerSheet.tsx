import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { fromISODate, toISODate, todayISO } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

import { Sheet } from './Sheet';

export const addDays = (iso: string, n: number) => {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

/** Monday-first 6×7 grid of YYYY-MM-DD for the month containing `month` (any day in it). */
export function monthGrid(month: string): string[] {
  const first = fromISODate(month);
  first.setDate(1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toISODate(d);
  });
}

// Weekday initials in the device language, Monday first (2024-01-01 was a Monday).
export const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'narrow' }),
);

/** Themed calendar in a bottom sheet. Commits only on Done. Mount it when opening so it
 *  starts from `value`. */
export function DatePickerSheet({
  visible,
  value,
  title = 'Select date',
  onDone,
  onCancel,
}: {
  visible: boolean;
  value: string | null;
  title?: string;
  onDone: (iso: string) => void;
  onCancel: () => void;
}) {
  const today = todayISO();
  const [selected, setSelected] = useState(value ?? today);
  const [month, setMonth] = useState(value ?? today);

  const days = useMemo(() => monthGrid(month), [month]);
  const monthIndex = fromISODate(month).getMonth();
  const shiftMonth = (delta: number) => {
    const d = fromISODate(month);
    setMonth(toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1)));
  };
  const pick = (iso: string) => {
    setSelected(iso);
    setMonth(iso);
  };

  return (
    <Sheet visible={visible} title={title} onCancel={onCancel} onDone={() => onDone(selected)}>
      <View style={styles.quick}>
        {[
          { label: 'Today', iso: today },
          { label: 'Tomorrow', iso: addDays(today, 1) },
          { label: 'Next week', iso: addDays(today, 7) },
        ].map((q) => {
          const active = q.iso === selected;
          return (
            <Pressable
              key={q.label}
              onPress={() => pick(q.iso)}
              style={[styles.quickChip, active && styles.quickChipActive]}
            >
              <Text style={[styles.quickText, active && { color: colors.onPrimary }]}>{q.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.monthRow}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} style={styles.arrow} accessibilityLabel="Previous month">
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.month}>
          {fromISODate(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={10} style={styles.arrow} accessibilityLabel="Next month">
          <Feather name="chevron-right" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <Text key={`w${i}`} style={styles.weekday}>
            {w}
          </Text>
        ))}
        {days.map((iso) => {
          const d = fromISODate(iso);
          const inMonth = d.getMonth() === monthIndex;
          const isSelected = iso === selected;
          const isToday = iso === today;
          return (
            <Pressable
              key={iso}
              onPress={() => pick(iso)}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityLabel={d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              accessibilityState={{ selected: isSelected }}
            >
              <View
                style={[
                  styles.day,
                  isToday && !isSelected && styles.today,
                  isSelected && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !inMonth && { color: colors.grey },
                    isToday && { color: colors.primary, fontWeight: '800' },
                    isSelected && { color: colors.onPrimary },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', gap: 8 },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  quickChipActive: { backgroundColor: colors.primary },
  quickText: { fontSize: 14, fontWeight: '600', color: colors.text },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  month: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    paddingBottom: 6,
  },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.gold },
  daySelected: { backgroundColor: colors.primary },
  dayText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
