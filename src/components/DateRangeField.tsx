import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fromISODate } from '@/lib/format';
import type { DateRange } from '@/lib/periods';
import { colors, radius } from '@/lib/theme';

import { DateRangePickerSheet } from './pickers/DateRangePickerSheet';
import { Text } from './Text';

/** "24 Oct – 23 Nov 2026", or with both years when the range crosses one. */
export function formatRange({ from, to }: DateRange): string {
  const a = fromISODate(from);
  const b = fromISODate(to);
  const sameYear = a.getFullYear() === b.getFullYear();
  const startText = a.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endText = b.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return from === to ? endText : `${startText} – ${endText}`;
}

/** One field for a From–To date range, picked on a single calendar. */
export function DateRangeField({
  value,
  onChange,
  label = 'Dates',
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Screen-reader label and sheet title. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const days =
    Math.round((fromISODate(value.to).getTime() - fromISODate(value.from).getTime()) / 86_400_000) + 1;
  const text = formatRange(value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.field}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
      >
        <Feather name="calendar" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.text} numberOfLines={1}>
            {text}
          </Text>
          <Text style={styles.days}>
            {days} day{days === 1 ? '' : 's'}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      {open && (
        <DateRangePickerSheet
          visible={open}
          value={value}
          title={label === 'Dates' ? 'Select dates' : label}
          onDone={(range) => {
            setOpen(false);
            onChange(range);
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  text: { fontSize: 15, fontWeight: '700', color: colors.text },
  days: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
