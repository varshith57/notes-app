import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Task } from '@/db/types';
import { formatDay, todayISO } from '@/lib/format';
import { colors, PRIORITY_COLORS, radius } from '@/lib/theme';

import { formatTime } from './DateTimeField';

const KIND_ICON = { todo: 'check-square', agenda: 'calendar', reminder: 'bell' } as const;

export function TaskRow({
  task,
  onPress,
  onToggle,
  showDate = true,
}: {
  task: Task;
  onPress: () => void;
  onToggle: () => void;
  showDate?: boolean;
}) {
  const overdue = !task.done && task.dueOn != null && task.dueOn < todayISO();
  const when = [
    showDate && task.dueOn ? formatDay(task.dueOn) : null,
    task.dueTime ? formatTime(task.dueTime) + (task.endTime ? ` – ${formatTime(task.endTime)}` : '') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        style={[styles.check, task.done && styles.checkDone]}
      >
        {task.done && <Feather name="check" size={15} color={colors.onPrimary} />}
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.title, task.done && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {(!!when || task.kind !== 'todo') && (
          <View style={styles.metaRow}>
            <Feather name={KIND_ICON[task.kind]} size={12} color={overdue ? colors.danger : colors.muted} />
            {!!when && <Text style={[styles.meta, overdue && { color: colors.danger }]}>{when}</Text>}
          </View>
        )}
      </View>
      <View style={[styles.priority, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  titleDone: { color: colors.muted, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: 12, color: colors.muted },
  priority: { width: 6, alignSelf: 'stretch', borderRadius: 3 },
});
