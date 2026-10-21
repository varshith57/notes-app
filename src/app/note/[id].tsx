import { Feather } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
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

import { createNote, deleteNote, getNote, updateNote } from '@/db/notesRepo';
import type { NoteInput } from '@/db/types';
import { emitDataChanged } from '@/lib/dataEvents';
import { formatTimestamp } from '@/lib/format';
import { colors, NOTE_COLOR_KEYS, NOTE_COLORS, type NoteColor } from '@/lib/theme';

const AUTOSAVE_MS = 400;

/**
 * Distraction-free editor. Saves automatically as you type; an empty note is
 * discarded when you leave. No length limit on title or body.
 */
export default function NoteEditorScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();

  const idRef = useRef<number | null>(params.id === 'new' ? null : Number(params.id));
  const [loaded, setLoaded] = useState(idRef.current == null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<NoteColor>('lavender');
  const [pinned, setPinned] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const latest = useRef<NoteInput>({ title, body, color, pinned });
  latest.current = { title, body, color, pinned };
  const saving = useRef<Promise<void>>(Promise.resolve());
  const dirty = useRef(false);

  useEffect(() => {
    if (idRef.current == null) return;
    getNote(db, idRef.current).then((note) => {
      if (!note) return router.back();
      setTitle(note.title);
      setBody(note.body);
      setColor(note.color);
      setPinned(note.pinned);
      setUpdatedAt(note.updatedAt);
      setLoaded(true);
    });
  }, [db]);

  // Serialise writes so a create never races an update for the same note.
  const persist = () => {
    saving.current = saving.current.then(async () => {
      const input = latest.current;
      const empty = !input.title.trim() && !input.body.trim();
      if (idRef.current == null) {
        if (!empty) idRef.current = await createNote(db, input);
      } else {
        await updateNote(db, idRef.current, input);
      }
      dirty.current = false;
      emitDataChanged('notes');
    });
  };

  useEffect(() => {
    if (!loaded) return;
    dirty.current = true;
    const t = setTimeout(persist, AUTOSAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, color, pinned]);

  // Flush on leave; drop the row if the user cleared everything.
  useEffect(
    () => () => {
      if (dirty.current) persist();
      saving.current.then(async () => {
        const { title: t, body: b } = latest.current;
        if (idRef.current != null && !t.trim() && !b.trim()) {
          await deleteNote(db, idRef.current);
          emitDataChanged('notes');
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const confirmDelete = () => {
    Alert.alert('Delete this note?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await saving.current;
          if (idRef.current != null) await deleteNote(db, idRef.current);
          dirty.current = false;
          latest.current = { ...latest.current, title: '', body: '' };
          router.back();
        },
      },
    ]);
  };

  const palette = NOTE_COLORS[color];
  if (!loaded) return null;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: palette.background },
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setPinned((p) => !p)}
                hitSlop={8}
                accessibilityLabel={pinned ? 'Unpin note' : 'Pin note'}
              >
                <Feather name="bookmark" size={21} color={pinned ? palette.accent : colors.muted} />
              </Pressable>
              {idRef.current != null && (
                <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete note">
                  <Feather name="trash-2" size={21} color={colors.muted} />
                </Pressable>
              )}
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 44}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.title}
            placeholder="Title"
            placeholderTextColor="#A39FB5"
            value={title}
            onChangeText={setTitle}
            multiline
            scrollEnabled={false}
          />
          {updatedAt && <Text style={styles.meta}>Edited {formatTimestamp(updatedAt)}</Text>}
          <TextInput
            style={styles.body}
            placeholder="Start writing…"
            placeholderTextColor="#A39FB5"
            value={body}
            onChangeText={setBody}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            autoFocus={params.id === 'new'}
          />
        </ScrollView>

        <View style={[styles.palette, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {NOTE_COLOR_KEYS.map((key) => {
            const selected = key === color;
            return (
              <Pressable
                key={key}
                onPress={() => setColor(key)}
                accessibilityLabel={`${NOTE_COLORS[key].label} colour`}
                accessibilityState={{ selected }}
                style={[
                  styles.swatch,
                  { backgroundColor: NOTE_COLORS[key].background },
                  selected && { borderColor: NOTE_COLORS[key].accent },
                ]}
              >
                {selected && <Feather name="check" size={16} color={NOTE_COLORS[key].accent} />}
              </Pressable>
            );
          })}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 20, paddingHorizontal: 4 },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 40, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, padding: 0 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 6, marginBottom: 4 },
  body: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.text,
    marginTop: 12,
    minHeight: 300,
    padding: 0,
  },
  palette: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
