import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDay, fromISODate, toISODate } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

function toHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fromHHMM(hhmm: string): Date {
  const d = new Date();
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export function formatTime(hhmm: string): string {
  return fromHHMM(hhmm).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Date or time field. iOS shows the native compact picker inline; Android opens the
 * system dialog on tap. `value` is YYYY-MM-DD (date) or HH:MM (time); null = unset.
 */
export function DateTimeField({
  mode,
  value,
  onChange,
  placeholder,
  onClear,
}: {
  mode: 'date' | 'time';
  value: string | null;
  onChange: (v: string) => void;
  placeholder: string;
  onClear?: () => void;
}) {
  const asDate = value ? (mode === 'date' ? fromISODate(value) : fromHHMM(value)) : new Date();
  const emit = (d: Date) => onChange(mode === 'date' ? toISODate(d) : toHHMM(d));
  const icon = mode === 'date' ? 'calendar' : 'clock';
  const label = value ? (mode === 'date' ? formatDay(value) : formatTime(value)) : placeholder;

  if (Platform.OS === 'ios' && value) {
    return (
      <View style={styles.field}>
        <Feather name={icon} size={18} color={colors.primary} />
        <DateTimePicker
          value={asDate}
          mode={mode}
          display="compact"
          onValueChange={(_, d) => emit(d)}
          style={{ flex: 1, alignItems: 'flex-start' }}
        />
        {onClear && <ClearButton onPress={onClear} />}
      </View>
    );
  }

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: asDate, mode, onValueChange: (_, d) => emit(d) });
    } else {
      // iOS with no value yet: seed with now, which reveals the inline picker above.
      emit(asDate);
    }
  };

  return (
    <Pressable onPress={open} style={styles.field}>
      <Feather name={icon} size={18} color={colors.primary} />
      <Text style={[styles.text, !value && { color: colors.muted }]}>{label}</Text>
      {value && onClear && <ClearButton onPress={onClear} />}
    </Pressable>
  );
}

function ClearButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityLabel="Clear">
      <Feather name="x" size={18} color={colors.muted} />
    </Pressable>
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
