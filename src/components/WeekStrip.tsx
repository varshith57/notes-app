import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fromISODate, toISODate, todayISO } from '@/lib/format';
import { colors, gradient } from '@/lib/theme';

/** Monday-first week containing `day`, as YYYY-MM-DD strings. */
export function weekOf(day: string): string[] {
  const d = fromISODate(day);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return toISODate(x);
  });
}

function shiftDays(day: string, n: number): string {
  const d = fromISODate(day);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Week of day pills like the reference calendar; selected day gets the gradient badge. */
export function WeekStrip({
  selected,
  busyDays,
  onSelect,
}: {
  selected: string;
  busyDays: Set<string>;
  onSelect: (day: string) => void;
}) {
  const days = weekOf(selected);
  const today = todayISO();

  return (
    <View style={styles.row}>
      <Pressable onPress={() => onSelect(shiftDays(selected, -7))} hitSlop={8} accessibilityLabel="Previous week">
        <Feather name="chevron-left" size={20} color={colors.muted} />
      </Pressable>
      {days.map((day) => {
        const date = fromISODate(day);
        const isSelected = day === selected;
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            style={[styles.day, isSelected && styles.daySelected]}
          >
            <Text style={[styles.weekday, isSelected && { color: colors.text }]}>
              {date.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </Text>
            {isSelected ? (
              <LinearGradient colors={gradient} style={styles.num}>
                <Text style={[styles.numText, { color: colors.onPrimary }]}>{date.getDate()}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.num, { backgroundColor: colors.surface }]}>
                <Text style={[styles.numText, day === today && { color: colors.primary, fontWeight: '800' }]}>
                  {date.getDate()}
                </Text>
              </View>
            )}
            <View style={[styles.dot, { opacity: busyDays.has(day) ? 1 : 0 }]} />
          </Pressable>
        );
      })}
      <Pressable onPress={() => onSelect(shiftDays(selected, 7))} hitSlop={8} accessibilityLabel="Next week">
        <Feather name="chevron-right" size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  day: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 3,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  daySelected: { borderColor: colors.gold },
  weekday: { fontSize: 13, fontWeight: '600', color: colors.muted },
  num: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 14, fontWeight: '700', color: colors.muted },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold },
});
