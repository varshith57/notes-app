import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { formatDay, formatTime } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

import { DatePickerSheet } from './pickers/DatePickerSheet';
import { TimePickerSheet } from './pickers/TimePickerSheet';

/**
 * Date or time field that opens the app's own themed picker sheet (same look on iOS,
 * Android and web). `value` is YYYY-MM-DD (date) or HH:MM (time); null = unset.
 */
export function DateTimeField({
  mode,
  value,
  onChange,
  placeholder,
  label = mode === 'date' ? 'Date' : 'Time',
  onClear,
}: {
  mode: 'date' | 'time';
  value: string | null;
  onChange: (v: string) => void;
  placeholder: string;
  /** What the field is ("End time", "From"…): screen-reader label and sheet title. */
  label?: string;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isDefaultLabel = label === 'Date' || label === 'Time';
  const sheetTitle = isDefaultLabel ? `Select ${label.toLowerCase()}` : label;
  const text = value ? (mode === 'date' ? formatDay(value) : formatTime(value)) : placeholder;
  const done = (v: string) => {
    setOpen(false);
    onChange(v);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.field}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? text : 'not set'}`}
      >
        <Feather name={mode === 'date' ? 'calendar' : 'clock'} size={18} color={colors.primary} />
        <Text style={[styles.text, !value && { color: colors.muted }]} numberOfLines={1}>
          {text}
        </Text>
        {value && onClear && (
          <Pressable onPress={onClear} hitSlop={10} accessibilityLabel={`Clear ${label.toLowerCase()}`}>
            <Feather name="x" size={18} color={colors.muted} />
          </Pressable>
        )}
      </Pressable>

      {open && mode === 'date' && (
        <DatePickerSheet
          visible={open}
          value={value}
          title={sheetTitle}
          onDone={done}
          onCancel={() => setOpen(false)}
        />
      )}
      {open && mode === 'time' && (
        <TimePickerSheet
          visible={open}
          value={value}
          title={sheetTitle}
          onDone={done}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  text: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
});
