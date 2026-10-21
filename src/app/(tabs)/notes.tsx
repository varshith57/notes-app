import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteCard } from '@/components/NoteCard';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { EmptyState, Fab, IconButton, ScreenTitle } from '@/components/ui';
import { listNotes } from '@/db/notesRepo';
import type { Note } from '@/db/types';
import { onDataChanged } from '@/lib/dataEvents';
import { colors, radius } from '@/lib/theme';

export default function NotesScreen() {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      const load = () => listNotes(db, search).then(setNotes);
      load();
      return onDataChanged('notes', load);
    }, [db, search]),
  );

  const openNote = (id: number | 'new') => router.push({ pathname: '/note/[id]', params: { id } });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={notes}
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
          </View>
        }
        ListEmptyComponent={
          search ? (
            <EmptyState icon="search" title="No matches" hint="Try a different word." />
          ) : (
            <EmptyState
              icon="edit-3"
              title="Your thoughts live here"
              hint="Tap + to jot down your first note. Write as much as you like."
            />
          )
        }
        renderItem={({ item }) => <NoteCard note={item} onPress={() => openNote(item.id)} />}
      />
      <Fab label="New note" bottom={TAB_BAR_SPACE} onPress={() => openNote('new')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20, paddingBottom: TAB_BAR_SPACE + 80, gap: 14 },
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
