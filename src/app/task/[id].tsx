import { Feather } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/DateTimeField';
import { Chip, SectionLabel, Segmented } from '@/components/ui';
import { getTask } from '@/db/tasksRepo';
import type { Priority, Task, TaskKind } from '@/db/types';
import { emitDataChanged } from '@/lib/dataEvents';
import { todayISO } from '@/lib/format';
import { removeTask, saveTask } from '@/lib/taskActions';
import { colors, gradient, PRIORITY_COLORS, radius } from '@/lib/theme';

function nextHour(): string {
  const h = (new Date().getHours() + 1) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

export default function TaskEditorScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; kind?: TaskKind; date?: string }>();
  const isNew = params.id === 'new';
  const taskId = isNew ? null : Number(params.id);
  const initialKind = params.kind ?? 'todo';

  const [loaded, setLoaded] = useState(isNew);
  const [existing, setExisting] = useState<Task | null>(null);
  const [kind, setKind] = useState<TaskKind>(initialKind);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dueOn, setDueOn] = useState<string | null>(
    params.date ?? (initialKind === 'todo' ? null : todayISO()),
  );
  const [dueTime, setDueTime] = useState<string | null>(initialKind === 'todo' ? null : nextHour());
  const [endTime, setEndTime] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('medium');

  useEffect(() => {
    if (taskId == null) return;
    getTask(db, taskId).then((t) => {
      if (!t) return router.back();
      setExisting(t);
      setKind(t.kind);
      setTitle(t.title);
      setDetails(t.details);
      setDueOn(t.dueOn);
      setDueTime(t.dueTime);
      setEndTime(t.endTime);
      setPriority(t.priority);
      setLoaded(true);
    });
  }, [db, taskId]);

  const changeKind = (k: TaskKind) => {
    setKind(k);
    // Agenda items and reminders always need a day and a time.
    if (k !== 'todo') {
      setDueOn((d) => d ?? todayISO());
      setDueTime((t) => t ?? nextHour());
    }
  };

  const save = async () => {
    if (!title.trim()) return Alert.alert('Add a title');
    if (endTime && dueTime && endTime <= dueTime) {
      return Alert.alert('Check the times', 'End time must be after the start time.');
    }

    const result = await saveTask(db, taskId, {
      kind,
      title: title.trim(),
      details: details.trim(),
      dueOn,
      dueTime: dueOn ? dueTime : null,
      endTime: kind === 'agenda' && dueOn ? endTime : null,
      priority,
    });
    emitDataChanged('tasks');

    if (result && 'error' in result) {
      Alert.alert(
        'Saved without an alert',
        result.error === 'past'
          ? 'That time has already passed, so no notification was scheduled.'
          : 'Notifications are turned off for this app. Enable them in Settings to get reminders.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
      return;
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete this task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeTask(db, existing);
          emitDataChanged('tasks');
          router.back();
        },
      },
    ]);
  };

  if (!loaded) return null;

  const needsDate = kind !== 'todo';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <Stack.Screen
        options={{
          title: isNew ? 'New task' : 'Edit task',
          headerRight: () =>
            existing ? (
              <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete task">
                <Feather name="trash-2" size={21} color={colors.muted} />
              </Pressable>
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Segmented
          value={kind}
          onChange={changeKind}
          options={[
            { value: 'todo', label: 'To-do', icon: 'check-square' },
            { value: 'agenda', label: 'Agenda', icon: 'calendar' },
            { value: 'reminder', label: 'Reminder', icon: 'bell' },
          ]}
        />

        <TextInput
          style={styles.title}
          placeholder={
            kind === 'reminder' ? 'Remind me to…' : kind === 'agenda' ? 'What’s planned?' : 'What needs doing?'
          }
          placeholderTextColor="#A39FB5"
          value={title}
          onChangeText={setTitle}
          autoFocus={isNew}
          multiline
        />

        <SectionLabel>{needsDate ? 'WHEN' : 'DUE (OPTIONAL)'}</SectionLabel>
        <View style={styles.row}>
          <DateTimeField
            mode="date"
            value={dueOn}
            onChange={setDueOn}
            placeholder="No date"
            onClear={needsDate ? undefined : () => {
              setDueOn(null);
              setDueTime(null);
            }}
          />
        </View>
        {dueOn && (
          <View style={styles.row}>
            <DateTimeField
              mode="time"
              value={dueTime}
              onChange={setDueTime}
              placeholder={kind === 'agenda' ? 'Start time' : 'Time'}
              onClear={needsDate ? undefined : () => setDueTime(null)}
            />
            {kind === 'agenda' && (
              <DateTimeField
                mode="time"
                value={endTime}
                onChange={setEndTime}
                placeholder="End time"
                onClear={() => setEndTime(null)}
              />
            )}
          </View>
        )}
        {kind === 'reminder' && (
          <Text style={styles.hint}>
            <Feather name="bell" size={12} /> You’ll get a notification at this time.
          </Text>
        )}

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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable onPress={save}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButton}>
            <Text style={styles.saveText}>{isNew ? 'Save' : 'Update'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, paddingVertical: 8 },
  row: { flexDirection: 'row', gap: 10 },
  hint: { fontSize: 12, color: colors.muted },
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
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
