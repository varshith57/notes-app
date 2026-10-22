import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteCard } from '@/components/NoteCard';
import { SelectionBar } from '@/components/SelectionBar';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { EmptyState, Fab, IconButton, ScreenTitle } from '@/components/ui';
import { deleteNotes, listNotes } from '@/db/notesRepo';
import type { Note } from '@/db/types';
import { useSelection } from '@/hooks/useSelection';
import { emitDataChanged, onDataChanged } from '@/lib/dataEvents';
import { confirmDestructive } from '@/lib/dialogs';
import { colors, NOTE_COLOR_KEYS, NOTE_COLORS, radius, type NoteColor } from '@/lib/theme';

export default function NotesScreen() {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState<NoteColor | null>(null);
  const selection = useSelection();
  const { clear: clearSelection } = selection;

  useFocusEffect(
    useCallback(() => {
      const load = () => listNotes(db, search, -1, colorFilter).then(setNotes);
      load();
      const unsubscribe = onDataChanged('notes', load);
      return () => {
        unsubscribe();
        clearSelection();
      };
    }, [db, search, colorFilter, clearSelection]),
  );

  const openNote = (id: number | 'new') => router.push({ pathname: '/note/[id]', params: { id } });

  const deleteSelected = async () => {
    const ids = [...selection.selected];
    const label = ids.length === 1 ? 'this note' : `${ids.length} notes`;
    if (!(await confirmDestructive(`Delete ${label}?`, 'This cannot be undone.'))) return;
    await deleteNotes(db, ids);
    selection.clear();
    emitDataChanged('notes');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {selection.selecting && (
        <SelectionBar
          count={selection.selected.size}
          total={notes.length}
          onCancel={selection.clear}
          onSelectAll={() => selection.selectAll(notes.map((n) => n.id))}
          onDelete={deleteSelected}
        />
      )}
      <FlatList
        data={notes}
        extraData={selection.selected}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <ScreenTitle
              title="My Notes"
              subtitle={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
              right={
                <IconButton
                  icon={searching ? 'x' : 'search'}
                  label={searching ? 'Close search' : 'Search notes'}
                  onPress={() => {
                    setSearching((s) => !s);
                    setSearch('');
                  }}
                />
              }
            />
            {searching && (
              <TextInput
                autoFocus
                style={styles.search}
                placeholder="Search your notes"
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
              />
            )}
            <ColorFilter value={colorFilter} onChange={setColorFilter} />
          </View>
        }
        ListEmptyComponent={
          search || colorFilter ? (
            <EmptyState
              icon="search"
              title="No matches"
              hint={
                colorFilter
                  ? `No ${NOTE_COLORS[colorFilter].label.toLowerCase()} notes${search ? ' with that word' : ''}.`
                  : 'Try a different word.'
              }
            />
          ) : (
            <EmptyState
              icon="edit-3"
              title="Your thoughts live here"
              hint="Tap + to jot down your first note. Write as much as you like."
            />
          )
        }
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            selected={selection.selected.has(item.id)}
            onPress={() => (selection.selecting ? selection.toggle(item.id) : openNote(item.id))}
            onLongPress={() => selection.begin(item.id)}
          />
        )}
      />
      {!selection.selecting && (
        <Fab label="New note" bottom={TAB_BAR_SPACE} onPress={() => openNote('new')} />
      )}
    </SafeAreaView>
  );
}

/** "All" plus one swatch per note colour; tapping the active one clears the filter. */
function ColorFilter({
  value,
  onChange,
}: {
  value: NoteColor | null;
  onChange: (c: NoteColor | null) => void;
}) {
  return (
    <View style={styles.filterRow}>
      <Pressable
        onPress={() => onChange(null)}
        style={[styles.allChip, value == null && styles.allChipActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: value == null }}
        accessibilityLabel="All colours"
      >
        <Text style={[styles.allText, value == null && { color: colors.onPrimary }]}>All</Text>
      </Pressable>
      {NOTE_COLOR_KEYS.map((key) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(active ? null : key)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Show ${NOTE_COLORS[key].label.toLowerCase()} notes`}
            style={[styles.filterRing, active && { borderColor: colors.primary }]}
          >
            <View style={[styles.filterDot, { backgroundColor: NOTE_COLORS[key].background }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20, paddingBottom: TAB_BAR_SPACE + 80, gap: 14 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  allChip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  allChipActive: { backgroundColor: colors.primary },
  allText: { fontSize: 14, fontWeight: '700', color: colors.text },
  filterRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grey,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
});
