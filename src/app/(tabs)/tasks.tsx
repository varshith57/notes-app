import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState, type ComponentProps } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectionBar } from '@/components/SelectionBar';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { TaskRow } from '@/components/TaskRow';
import { Text } from '@/components/Text';
import { WeekStrip, weekOf } from '@/components/WeekStrip';
import { EmptyState, Fab, ScreenTitle, Segmented } from '@/components/ui';
import { listBusyDays, listForDay, listReminders, listTodos } from '@/db/tasksRepo';
import type { Task } from '@/db/types';
import { useSelection } from '@/hooks/useSelection';
import { emitDataChanged, onDataChanged } from '@/lib/dataEvents';
import { confirmDestructive } from '@/lib/dialogs';
import { formatLongDate, formatTime, fromISODate, todayISO } from '@/lib/format';
import { removeTasks, toggleTaskDone } from '@/lib/taskActions';
import { colors, radius } from '@/lib/theme';

/** Three views of the same tasks: all of them, by day, and the ones that will notify. */
type TaskView = 'todo' | 'agenda' | 'reminder';

const EMPTY: Record<TaskView, { title: string; hint: string }> = {
  todo: { title: 'All clear', hint: 'Tap + to add something to your to-do list.' },
  agenda: { title: 'Nothing planned', hint: 'Tap + to block time on this day.' },
  reminder: { title: 'No reminders', hint: 'Tap + to get a notification at the right time.' },
};

export default function TasksScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ view?: TaskView }>();
  const [view, setView] = useState<TaskView>(params.view ?? 'todo');
  const [day, setDay] = useState(todayISO());
  const [showDone, setShowDone] = useState(false);
  const [items, setItems] = useState<Task[]>([]);
  const [busyDays, setBusyDays] = useState<Set<string>>(new Set());
  const selection = useSelection();
  const { clear: clearSelection } = selection;

  // Home screen shortcuts deep-link into a specific view: follow the param when it changes.
  const [seenParam, setSeenParam] = useState(params.view);
  if (params.view !== seenParam) {
    setSeenParam(params.view);
    if (params.view) setView(params.view);
  }

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
      const unsubscribe = onDataChanged('tasks', load);
      // Leaving the tab or switching view/day ends any selection.
      return () => {
        unsubscribe();
        clearSelection();
      };
    }, [db, view, day, showDone, clearSelection]),
  );

  const deleteSelected = async () => {
    const chosen = items.filter((t) => selection.selected.has(t.id));
    const label = chosen.length === 1 ? 'this task' : `${chosen.length} tasks`;
    if (!(await confirmDestructive(`Delete ${label}?`, 'This cannot be undone.'))) return;
    await removeTasks(db, chosen);
    selection.clear();
    emitDataChanged('tasks');
  };

  const toggle = async (task: Task) => {
    await toggleTaskDone(db, task);
    setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
  };

  const open = (task: Task) => router.push({ pathname: '/task/[id]', params: { id: task.id } });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {selection.selecting && (
        <SelectionBar
          count={selection.selected.size}
          total={items.length}
          onCancel={selection.clear}
          onSelectAll={() => selection.selectAll(items.map((t) => t.id))}
          onDelete={deleteSelected}
        />
      )}
      <FlatList
        data={items}
        extraData={selection.selected}
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
        renderItem={({ item }) => {
          // While selecting, both the row and its checkbox toggle selection.
          const select = () => selection.toggle(item.id);
          const rowProps = {
            task: item,
            selected: selection.selected.has(item.id),
            onPress: selection.selecting ? select : () => open(item),
            onToggle: selection.selecting ? select : () => toggle(item),
            onLongPress: () => selection.begin(item.id),
          };
          return view === 'agenda' ? <AgendaItem {...rowProps} /> : <TaskRow {...rowProps} />;
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EmptyState
            icon={view === 'todo' ? 'check-circle' : view === 'agenda' ? 'calendar' : 'bell'}
            {...EMPTY[view]}
          />
        }
      />
      {!selection.selecting && (
        <Fab
          label="Add task"
          bottom={TAB_BAR_SPACE}
          onPress={() =>
            router.push({
              pathname: '/task/[id]',
              // Pre-fill from the current view: a time on the selected day, or a reminder slot.
              params: { id: 'new', preset: view, ...(view === 'agenda' ? { date: day } : {}) },
            })
          }
        />
      )}
    </SafeAreaView>
  );
}

/** Timeline row: time column on the left, tinted card on the right (as in the reference). */
function AgendaItem(props: ComponentProps<typeof TaskRow>) {
  const { task } = props;
  return (
    <View style={styles.agendaRow}>
      <Text style={styles.agendaTime}>{task.dueTime ? formatTime(task.dueTime) : 'All day'}</Text>
      <View style={{ flex: 1 }}>
        <TaskRow {...props} showDate={false} />
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
