import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { fromISODate, toISODate, todayISO } from '@/lib/format';
import type { DateRange } from '@/lib/periods';
import { colors, radius } from '@/lib/theme';

import { addDays, monthGrid, WEEKDAYS } from './DatePickerSheet';
import { Sheet } from './Sheet';

const CELL = 38;

const shortDate = (iso: string) =>
  fromISODate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Presets, worked out from today. */
function presets(today: string): { label: string; range: DateRange }[] {
  const d = fromISODate(today);
  return [
    {
      label: 'This month',
      range: {
        from: toISODate(new Date(d.getFullYear(), d.getMonth(), 1)),
        to: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      },
    },
    { label: 'Next 30 days', range: { from: today, to: addDays(today, 29) } },
    { label: 'Last 30 days', range: { from: addDays(today, -29), to: today } },
  ];
}

/**
 * One calendar for a date range: the first tap sets the start, the second the end (tapping
 * a day before the start moves the start instead). Days in between are highlighted.
 * Commits only on Done; mount it when opening so it starts from `value`.
 */
export function DateRangePickerSheet({
  visible,
  value,
  title = 'Select dates',
  onDone,
  onCancel,
}: {
  visible: boolean;
  value: DateRange;
  title?: string;
  onDone: (range: DateRange) => void;
  onCancel: () => void;
}) {
  const today = todayISO();
  const [start, setStart] = useState(value.from);
  // null while waiting for the second tap.
  const [end, setEnd] = useState<string | null>(value.to);
  const [month, setMonth] = useState(value.from);

  const days = useMemo(() => monthGrid(month), [month]);
  const monthIndex = fromISODate(month).getMonth();
  const shiftMonth = (delta: number) => {
    const d = fromISODate(month);
    setMonth(toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1)));
  };

  const pick = (iso: string) => {
    if (end != null || iso < start) {
      // Starting a new range (or moving the start earlier while choosing the end).
      setStart(iso);
      setEnd(null);
    } else {
      setEnd(iso);
    }
  };

  const applyPreset = (range: DateRange) => {
    setStart(range.from);
    setEnd(range.to);
    setMonth(range.from);
  };

  const to = end ?? start;
  const dayCount = Math.round((fromISODate(to).getTime() - fromISODate(start).getTime()) / 86_400_000) + 1;

  return (
    <Sheet visible={visible} title={title} onCancel={onCancel} onDone={() => onDone({ from: start, to })}>
      <View style={styles.summary}>
        <Endpoint label="From" value={shortDate(start)} active={end != null} />
        <Feather name="arrow-right" size={16} color={colors.muted} />
        <Endpoint label="To" value={end ? shortDate(end) : 'Pick end date'} active={end == null} />
      </View>
      <Text style={styles.hint}>
        {end == null
          ? 'Now tap the last day.'
          : `${dayCount} day${dayCount === 1 ? '' : 's'} · tap a day to start a new range`}
      </Text>

      <View style={styles.quick}>
        {presets(today).map((p) => {
          const active = p.range.from === start && p.range.to === end;
          return (
            <Pressable
              key={p.label}
              onPress={() => applyPreset(p.range)}
              style={[styles.quickChip, active && styles.quickChipActive]}
            >
              <Text style={[styles.quickText, active && { color: colors.onPrimary }]}>{p.label}</Text>
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
          const isEnd = iso === start || iso === end;
          const inside = end != null && iso > start && iso < end;
          // The band joins the two ends; it starts/stops at the middle of an end cell.
          const band = end != null && start !== end && (inside || isEnd);
          const isToday = iso === today;
          return (
            <Pressable
              key={iso}
              onPress={() => pick(iso)}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityLabel={d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              accessibilityState={{ selected: isEnd || inside }}
            >
              {band && (
                <View
                  style={[
                    styles.band,
                    iso === start && { left: '50%' },
                    iso === end && { right: '50%' },
                  ]}
                />
              )}
              <View style={[styles.day, isToday && !isEnd && styles.today, isEnd && styles.dayEnd]}>
                <Text
                  style={[
                    styles.dayText,
                    !inMonth && { color: colors.grey },
                    inside && { color: colors.primary },
                    isToday && !isEnd && { color: colors.primary, fontWeight: '800' },
                    isEnd && { color: colors.onPrimary },
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

function Endpoint({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <View style={[styles.endpoint, active && styles.endpointActive]}>
      <Text style={styles.endpointLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.endpointValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  endpoint: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  // Highlights the end the next tap will set.
  endpointActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  endpointLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: colors.muted },
  endpointValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  hint: { fontSize: 12, color: colors.muted, marginTop: -4 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  band: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    height: CELL,
    backgroundColor: colors.primarySoft,
  },
  day: { width: CELL, height: CELL, borderRadius: CELL / 2, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.gold },
  dayEnd: { backgroundColor: colors.primary },
  dayText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
