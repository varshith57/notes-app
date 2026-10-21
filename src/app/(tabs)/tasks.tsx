import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatTime } from '@/components/DateTimeField';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { TaskRow } from '@/components/TaskRow';
import { WeekStrip, weekOf } from '@/components/WeekStrip';
import { EmptyState, Fab, ScreenTitle, Segmented } from '@/components/ui';
import { listBusyDays, listForDay, listReminders, listTodos } from '@/db/tasksRepo';
import type { Task, TaskKind } from '@/db/types';
import { onDataChanged } from '@/lib/dataEvents';
import { formatLongDate, fromISODate, todayISO } from '@/lib/format';
import { toggleTaskDone } from '@/lib/taskActions';
import { colors, radius } from '@/lib/theme';

const EMPTY: Record<TaskKind, { title: string; hint: string }> = {
  todo: { title: 'All clear', hint: 'Tap + to add something to your to-do list.' },
  agenda: { title: 'Nothing planned', hint: 'Tap + to block time on this day.' },
  reminder: { title: 'No reminders', hint: 'Tap + to get a notification at the right time.' },
};

export default function TasksScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ view?: TaskKind }>();
  const [view, setView] = useState<TaskKind>(params.view ?? 'todo');
  const [day, setDay] = useState(todayISO());
  const [showDone, setShowDone] = useState(false);
  const [items, setItems] = useState<Task[]>([]);
  const [busyDays, setBusyDays] = useState<Set<string>>(new Set());

  // Home screen shortcuts deep-link into a specific view.
  useEffect(() => {
    if (params.view) setView(params.view);
  }, [params.view]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (view === 'todo') setItems(await listTodos(db, showDone));
        else if (view === 'reminder') setItems(await listReminders(db, showDone));
        else {
          const week = weekOf(day);
          setItems(await listForDay(db, day));
          setBusyDays(new Set(await listBusyDays(db, week[0], week[6])));
        }
      };
      load();
      return onDataChanged('tasks', load);
    }, [db, view, day, showDone]),
  );

  const toggle = async (task: Task) => {
    await toggleTaskDone(db, task);
    setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
  };

  const open = (task: Task) => router.push({ pathname: '/task/[id]', params: { id: task.id } });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 6 }}>
            <ScreenTitle title="Tasks" subtitle={formatLongDate(new Date())} />
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'todo', label: 'To-do', icon: 'check-square' },
                { value: 'agenda', label: 'Agenda', icon: 'calendar' },
                { value: 'reminder', label: 'Reminders', icon: 'bell' },
              ]}
            />
            {view === 'agenda' ? (
              <>
                <WeekStrip selected={day} busyDays={busyDays} onSelect={setDay} />
                <Text style={styles.dayTitle}>{formatLongDate(fromISODate(day))}</Text>
              </>
            ) : (
              <Pressable onPress={() => setShowDone((s) => !s)} style={{ alignSelf: 'flex-end' }}>
                <Text style={styles.toggle}>{showDone ? 'Hide completed' : 'Show completed'}</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) =>
          view === 'agenda' ? (
            <AgendaItem task={item} onPress={() => open(item)} onToggle={() => toggle(item)} />
          ) : (
            <TaskRow task={item} onPress={() => open(item)} onToggle={() => toggle(item)} />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EmptyState
            icon={view === 'todo' ? 'check-circle' : view === 'agenda' ? 'calendar' : 'bell'}
            {...EMPTY[view]}
          />
        }
      />
      <Fab
        label="Add task"
        bottom={TAB_BAR_SPACE}
        onPress={() =>
          router.push({
            pathname: '/task/[id]',
            params: { id: 'new', kind: view, ...(view === 'agenda' ? { date: day } : {}) },
          })
        }
      />
    </SafeAreaView>
  );
}

/** Timeline row: time column on the left, tinted card on the right (as in the reference). */
function AgendaItem({ task, onPress, onToggle }: { task: Task; onPress: () => void; onToggle: () => void }) {
  return (
    <View style={styles.agendaRow}>
      <Text style={styles.agendaTime}>{task.dueTime ? formatTime(task.dueTime) : 'All day'}</Text>
      <View style={{ flex: 1 }}>
        <TaskRow task={task} onPress={onPress} onToggle={onToggle} showDate={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20, paddingBottom: TAB_BAR_SPACE + 80 },
  toggle: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  dayTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  agendaRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  agendaTime: {
    width: 64,
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    borderRadius: radius.sm,
  },
});
