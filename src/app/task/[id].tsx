import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/DateTimeField';
import { Text, TextInput } from '@/components/Text';
import { Chip, SectionLabel, webHeaderLeft } from '@/components/ui';
import { getTask } from '@/db/tasksRepo';
import type { Priority, Task } from '@/db/types';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { emitDataChanged } from '@/lib/dataEvents';
import { confirmDestructive, leaveTo, showMessage } from '@/lib/dialogs';
import { toHHMM, toISODate } from '@/lib/format';
import { useReminderPrefs } from '@/lib/reminderPrefs';
import type { ScheduleError } from '@/lib/reminders';
import { removeTask, saveTask } from '@/lib/taskActions';
import { colors, gradient, PRIORITY_COLORS, radius } from '@/lib/theme';

const REMINDER_ERRORS: Record<ScheduleError, string> = {
  past: 'That time has already passed, so no notification was scheduled.',
  denied: 'Notifications are turned off for this app. Enable them in Settings to get reminders.',
  unsupported: 'Reminder notifications only work in the phone app, not in the web preview.',
  disabled: 'Reminders are turned off in Settings, so no notification was scheduled.',
};

/** Height of the Save bar while it sits on the keyboard, for keeping the caret clear of it. */
const FOOTER_HEIGHT = 78;

/** Default slot for new timed tasks: the top of the next hour (tomorrow after 11 pm). */
function nextHourSlot(): { date: string; time: string } {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return { date: toISODate(d), time: toHHMM(d) };
}

export default function TaskEditorScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  // `preset` comes from the Tasks view the + was tapped in: Agenda pre-fills the selected
  // day and a time, Reminders pre-fills the next hour; To-do starts undated.
  const params = useLocalSearchParams<{
    id: string;
    preset?: 'todo' | 'agenda' | 'reminder';
    date?: string;
  }>();
  const isNew = params.id === 'new';
  const taskId = isNew ? null : Number(params.id);
  const timed = params.preset === 'agenda' || params.preset === 'reminder';

  const reminders = useReminderPrefs();
  const [loaded, setLoaded] = useState(isNew);
  const [existing, setExisting] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dueOn, setDueOn] = useState<string | null>(
    params.date ?? (timed ? nextHourSlot().date : null),
  );
  const [dueTime, setDueTime] = useState<string | null>(timed ? nextHourSlot().time : null);
  const [endTime, setEndTime] = useState<string | null>(null);
  // On by default: it only takes effect once the task has a date and a time.
  const [remind, setRemind] = useState(true);
  const [priority, setPriority] = useState<Priority>('medium');

  // Unsaved-changes guard: compare the form with what was loaded (or the blank form).
  const form = JSON.stringify([title, details, dueOn, dueTime, endTime, remind, priority]);
  const [pristine, setPristine] = useState<string | null>(isNew ? form : null);
  const allowLeave = useUnsavedChangesGuard(
    loaded && pristine !== null && form !== pristine,
    'this task',
  );

  useEffect(() => {
    if (taskId == null) return;
    getTask(db, taskId).then((t) => {
      if (!t) return leaveTo('/tasks');
      setExisting(t);
      setTitle(t.title);
      setDetails(t.details);
      setDueOn(t.dueOn);
      setDueTime(t.dueTime);
      setEndTime(t.endTime);
      setRemind(t.remind);
      setPriority(t.priority);
      setPristine(
          JSON.stringify([
          t.title,
          t.details,
          t.dueOn,
          t.dueTime,
          t.endTime,
          t.remind,
          t.priority,
      ]),
      );
      setLoaded(true);
    });
  }, [db, taskId]);

  const doSave = async () => {
    if (!title.trim()) return showMessage('Add a title');
    if (endTime && dueTime && endTime <= dueTime) {
      return showMessage('Check the times', 'End time must be after the start time.');
    }

    const result = await saveTask(db, taskId, {
      title: title.trim(),
      details: details.trim(),
      dueOn,
      dueTime: dueOn ? dueTime : null,
      endTime: dueOn && dueTime ? endTime : null,
      remind,
      priority,
    });
    emitDataChanged('tasks');

    if (result && 'error' in result) {
      await showMessage('Saved without an alert', REMINDER_ERRORS[result.error]);
    }
    allowLeave();
    leaveTo('/tasks');
  };

  // Ignore repeat taps while a save is in flight, so one entry can't be stored twice.
  const busy = useRef(false);
  const save = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await doSave();
    } finally {
      busy.current = false;
    }
  };

  const confirmDelete = async () => {
    if (!existing) return;
    if (!(await confirmDestructive('Delete this task?', 'This cannot be undone.'))) return;
    await removeTask(db, existing);
    emitDataChanged('tasks');
    allowLeave();
    leaveTo('/tasks');
  };

  if (!loaded) return null;

  const canRemind = dueOn != null && dueTime != null && reminders.enabled;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: isNew ? 'New task' : 'Edit task',
          headerLeft: webHeaderLeft('/tasks'),
          headerRight: () =>
            existing ? (
              <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete task">
                <Feather name="trash-2" size={21} color={colors.muted} />
              </Pressable>
            ) : null,
        }}
      />
      {/* Scrolls the field being typed in (and its caret) above the keyboard and the
          Save button that rides on top of it. */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        bottomOffset={FOOTER_HEIGHT + 16}
      >
        <TextInput
          style={styles.title}
          placeholder="What needs doing?"
          placeholderTextColor={colors.placeholder}
          value={title}
          onChangeText={setTitle}
          autoFocus={isNew}
          multiline
        />

        <SectionLabel>WHEN (OPTIONAL)</SectionLabel>
        <View style={styles.row}>
          <DateTimeField
            mode="date"
            value={dueOn}
            onChange={setDueOn}
            placeholder="Add a date"
            onClear={() => {
              setDueOn(null);
              setDueTime(null);
              setEndTime(null);
            }}
          />
        </View>
        {dueOn && (
          <View style={styles.row}>
            <DateTimeField
              mode="time"
              value={dueTime}
              onChange={(t) => {
                setDueTime(t);
                if (endTime && endTime <= t) setEndTime(null);
              }}
              placeholder="Add a time"
              onClear={() => {
                setDueTime(null);
                setEndTime(null);
              }}
            />
            {dueTime && (
              <DateTimeField
                mode="time"
                value={endTime}
                onChange={setEndTime}
                placeholder="End time"
                label="End time"
                onClear={() => setEndTime(null)}
              />
            )}
          </View>
        )}

        <View style={[styles.remindRow, !canRemind && { opacity: 0.5 }]}>
          <Feather name="bell" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.remindTitle}>Remind me</Text>
            <Text style={styles.hint}>
              {!reminders.enabled
                ? 'Reminders are turned off in Settings.'
                : canRemind
                ? remind
                  ? 'You’ll get a notification at this time.'
                  : 'No notification for this task.'
                : 'Add a date and time to get a notification.'}
            </Text>
          </View>
          <Switch
            value={remind && canRemind}
            onValueChange={setRemind}
            disabled={!canRemind}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.background}
            // React Native Web uses its own (teal) knob colour when on unless told otherwise.
            {...(Platform.OS === 'web' ? ({ activeThumbColor: colors.background } as object) : {})}
            accessibilityLabel="Remind me"
          />
        </View>

        <SectionLabel>PRIORITY</SectionLabel>
        <View style={styles.row}>
          {(['high', 'medium', 'low'] as const).map((p) => (
            <Chip
              key={p}
              label={p[0].toUpperCase() + p.slice(1)}
              color={PRIORITY_COLORS[p]}
              selected={priority === p}
              onPress={() => setPriority(p)}
            />
          ))}
        </View>

        <SectionLabel>NOTES</SectionLabel>
        <TextInput
          style={styles.details}
          placeholder="Add details, links, a checklist…"
          placeholderTextColor={colors.muted}
          value={details}
          onChangeText={setDetails}
          multiline
          textAlignVertical="top"
        />
      </KeyboardAwareScrollView>

      <KeyboardStickyView
        offset={{ opened: Math.max(insets.bottom, 16) - 16 }}
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Pressable onPress={save}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButton}>
            <Text style={styles.saveText}>{isNew ? 'Save' : 'Update'}</Text>
          </LinearGradient>
        </Pressable>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, paddingVertical: 8 },
  row: { flexDirection: 'row', gap: 10 },
  hint: { fontSize: 12, color: colors.muted },
  remindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  remindTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  details: {
    minHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background },
  saveButton: { borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
