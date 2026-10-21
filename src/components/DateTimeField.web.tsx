import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { formatDay, formatTime, toHHMM, todayISO } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

/**
 * Web version of DateTimeField (Metro picks this file for web builds). The native picker
 * has no web implementation, so this uses the browser's own date/time input, whose
 * values are already YYYY-MM-DD and HH:MM.
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
  const icon = mode === 'date' ? 'calendar' : 'clock';

  if (!value) {
    // Same as native: tapping an empty field seeds it with now, revealing the input.
    return (
      <Pressable
        onPress={() => onChange(mode === 'date' ? todayISO() : toHHMM(new Date()))}
        style={styles.field}
      >
        <Feather name={icon} size={18} color={colors.primary} />
        <Text style={[styles.text, { color: colors.muted }]}>{placeholder}</Text>
      </Pressable>
    );
  }

  return (
    <label style={webStyles.field}>
      <Feather name={icon} size={18} color={colors.primary} />
      <span style={webStyles.label}>{mode === 'date' ? formatDay(value) : formatTime(value)}</span>
      <input
        type={mode}
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        // Clicking a date input's text only focuses a segment; open the full picker instead.
        onClick={(e) => e.currentTarget.showPicker?.()}
        aria-label={placeholder}
        style={webStyles.input}
      />
      {onClear && (
        // preventDefault stops the surrounding <label> from also opening the picker.
        <span style={webStyles.clear} onClick={(e) => e.preventDefault()}>
          <Pressable onPress={onClear} hitSlop={10} accessibilityLabel="Clear">
            <Feather name="x" size={18} color={colors.muted} />
          </Pressable>
        </span>
      )}
    </label>
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

// Plain DOM styles: the input sits invisibly over the label so a click anywhere on the
// field opens the browser's picker, while the friendly label ("Today", "6:30 PM") shows.
const webStyles = {
  field: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    padding: '0 14px',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: 500,
    color: colors.text,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  input: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    border: 'none',
  },
  // Lifted above the invisible input so it stays clickable.
  clear: { position: 'relative', zIndex: 1 },
} as const;
