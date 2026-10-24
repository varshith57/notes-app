import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { hasReminder, type Task } from '@/db/types';
import { SELECT_HOLD_MS } from '@/hooks/useSelection';
import { formatDay, formatTime, todayISO } from '@/lib/format';
import { colors, PRIORITY_COLORS, radius } from '@/lib/theme';

import { SelectedBadge, selectedStyle } from './SelectionBar';
import { Text } from './Text';

export function TaskRow({
  task,
  onPress,
  onToggle,
  onLongPress,
  selected = false,
  showDate = true,
}: {
  task: Task;
  onPress: () => void;
  onToggle: () => void;
  onLongPress?: () => void;
  selected?: boolean;
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
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={SELECT_HOLD_MS}
      style={({ pressed }) => [styles.row, selected && selectedStyle, pressed && { opacity: 0.7 }]}
    >
      {selected && <SelectedBadge />}
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityLabel={`Mark "${task.title}" ${task.done ? 'not done' : 'done'}`}
        accessibilityState={{ checked: task.done }}
        style={[styles.check, task.done && styles.checkDone]}
      >
        {task.done && <Feather name="check" size={15} color={colors.onPrimary} />}
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <StrikeText done={task.done} style={styles.title}>
          {task.title}
        </StrikeText>
        {!!when && (
          <View style={styles.metaRow}>
            <Feather name="calendar" size={12} color={overdue ? colors.danger : colors.muted} />
            <Text
              style={[styles.meta, overdue && { color: colors.danger }]}
            >
              {when}
            </Text>
            {hasReminder(task) && (
              <Feather
                name="bell"
                size={12}
                color={colors.primary}
                accessibilityLabel="Reminder on"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        )}
      </View>
      <View style={[styles.priority, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
    </Pressable>
  );
}

type TextLines = Parameters<
  NonNullable<React.ComponentProps<typeof Text>['onTextLayout']>
>[0]['nativeEvent']['lines'];

/** Thickness of the line through a completed task's title. */
const STRIKE = 2;

/**
 * A task title that's crossed out when done. The platform's strikethrough is a hairline in
 * the (faded) text colour, which is hard to see in low light, so phones draw a thicker line
 * through each wrapped line instead, measured from the text layout. Web (no text layout
 * events) keeps the standard strikethrough.
 */
function StrikeText({
  done,
  style,
  children,
}: {
  done: boolean;
  style: React.ComponentProps<typeof Text>['style'];
  children: string;
}) {
  const [lines, setLines] = useState<TextLines>([]);
  const native = Platform.OS !== 'web';
  return (
    <View>
      <Text
        style={[style, done && styles.titleDone, done && !native && styles.webStrike]}
        numberOfLines={2}
        onTextLayout={native ? (e) => setLines(e.nativeEvent.lines) : undefined}
      >
        {children}
      </Text>
      {done &&
        native &&
        lines.map((line, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[
              styles.strike,
              {
                left: line.x,
                width: line.width,
                // Through the middle of the lowercase letters.
                top: line.y + line.ascender - line.xHeight / 2 - STRIKE / 2,
              },
            ]}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    // Transparent border reserves space so selecting doesn't shift the layout.
    borderWidth: 2,
    borderColor: 'transparent',
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
  titleDone: { color: colors.muted },
  webStrike: { textDecorationLine: 'line-through', textDecorationColor: colors.text },
  strike: { position: 'absolute', height: STRIKE, borderRadius: 1, backgroundColor: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: 12, color: colors.muted },
  priority: { width: 6, alignSelf: 'stretch', borderRadius: 3 },
});
