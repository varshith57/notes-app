import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
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

import { RuledPaper } from '@/components/RuledPaper';
import { webHeaderLeft } from '@/components/ui';
import { createNote, deleteNote, getNote, updateNote } from '@/db/notesRepo';
import type { NoteInput } from '@/db/types';
import { emitDataChanged } from '@/lib/dataEvents';
import { confirmDestructive, leaveTo } from '@/lib/dialogs';
import { formatTimestamp } from '@/lib/format';
import {
  DEFAULT_NOTE_COLOR,
  NOTE_COLOR_KEYS,
  NOTE_COLORS,
  noteTone,
  type NoteColor,
} from '@/lib/theme';

const AUTOSAVE_MS = 400;

// Ruled-paper grid: every text row is LINE tall so writing sits on the rules.
const LINE = 32;
const PAPER_TOP = 16;
/** Rules sit this far above each row's bottom so text rests on them like handwriting. */
const BASELINE_LIFT = 5;
const MARGIN_X = 40;
const BODY_MIN = LINE * 12;
const snapToLines = (h: number) => Math.ceil(h / LINE) * LINE;

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
  // Mirrors `loaded` for the unmount cleanup, which only sees the first render's state.
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<NoteColor>(DEFAULT_NOTE_COLOR);
  const [pinned, setPinned] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [titleHeight, setTitleHeight] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);

  const latest = useRef<NoteInput>({ title, body, color, pinned });
  latest.current = { title, body, color, pinned };
  const saving = useRef<Promise<void>>(Promise.resolve());
  const dirty = useRef(false);
  // Snapshot of what's in the database, so merely opening a note doesn't re-save it
  // (which would bump its "edited" date).
  const saved = useRef(JSON.stringify(latest.current));

  useEffect(() => {
    if (idRef.current == null) return;
    getNote(db, idRef.current).then((note) => {
      if (!note) return leaveTo('/notes');
      setTitle(note.title);
      setBody(note.body);
      setColor(note.color);
      setPinned(note.pinned);
      setUpdatedAt(note.updatedAt);
      saved.current = JSON.stringify({
        title: note.title,
        body: note.body,
        color: note.color,
        pinned: note.pinned,
      });
      setLoaded(true);
    });
  }, [db]);

  // Serialise writes so a create never races an update for the same note.
  const persist = () => {
    saving.current = saving.current.then(async () => {
      const input = latest.current;
      if (JSON.stringify(input) === saved.current) {
        dirty.current = false;
        return;
      }
      const empty = !input.title.trim() && !input.body.trim();
      if (idRef.current == null) {
        if (!empty) idRef.current = await createNote(db, input);
      } else {
        await updateNote(db, idRef.current, input);
      }
      saved.current = JSON.stringify(input);
      dirty.current = false;
      emitDataChanged('notes');
    });
  };

  useEffect(() => {
    if (!loaded || JSON.stringify(latest.current) === saved.current) return;
    dirty.current = true;
    const t = setTimeout(persist, AUTOSAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, color, pinned]);

  // Flush on leave; drop the row if the user cleared everything. Only once the note has
  // loaded: leaving before then would see the initial empty fields and delete a real note.
  useEffect(
    () => () => {
      if (!loadedRef.current) return;
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

  const confirmDelete = async () => {
    if (!(await confirmDestructive('Delete this note?', 'This cannot be undone.'))) return;
    await saving.current;
    if (idRef.current != null) await deleteNote(db, idRef.current);
    dirty.current = false;
    latest.current = { ...latest.current, title: '', body: '' };
    emitDataChanged('notes');
    leaveTo('/notes');
  };

  const tone = noteTone(color);
  if (!loaded) return null;

  return (
    <View style={[styles.container, { backgroundColor: tone.background }]}>
      <StatusBar style={tone.dark ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: tone.background },
          headerTintColor: tone.text,
          headerLeft: webHeaderLeft('/notes', tone.text),
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setPinned((p) => !p)}
                hitSlop={8}
                accessibilityLabel={pinned ? 'Unpin note' : 'Pin note'}
              >
                <Feather name="bookmark" size={21} color={pinned ? tone.accent : tone.muted} />
              </Pressable>
              {idRef.current != null && (
                <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete note">
                  <Feather name="trash-2" size={21} color={tone.muted} />
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <RuledPaper
            style={styles.paper}
            lineHeight={LINE}
            top={PAPER_TOP - BASELINE_LIFT}
            marginX={MARGIN_X}
            lineColor={tone.rule}
            marginColor={tone.margin}
          >
            <TextInput
              style={[
                styles.title,
                { color: tone.text, height: snapToLines(Math.max(LINE, titleHeight)) },
              ]}
              placeholder="Title"
              placeholderTextColor={tone.placeholder}
              value={title}
              onChangeText={setTitle}
              multiline
              scrollEnabled={false}
              onContentSizeChange={(e) => setTitleHeight(e.nativeEvent.contentSize.height)}
            />
            {updatedAt && (
              <Text style={[styles.meta, { color: tone.muted }]}>
                Edited {formatTimestamp(updatedAt)}
              </Text>
            )}
            <TextInput
              style={[
                styles.body,
                { color: tone.text, height: snapToLines(Math.max(BODY_MIN, bodyHeight)) },
              ]}
              placeholder="Start writing…"
              placeholderTextColor={tone.placeholder}
              value={body}
              onChangeText={setBody}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              autoFocus={params.id === 'new'}
              onContentSizeChange={(e) => setBodyHeight(e.nativeEvent.contentSize.height)}
            />
          </RuledPaper>
        </ScrollView>

        <View
          style={[
            styles.palette,
            { borderTopColor: tone.rule, paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {NOTE_COLOR_KEYS.map((key) => {
            const selected = key === color;
            const swatch = NOTE_COLORS[key];
            return (
              <Pressable
                key={key}
                onPress={() => setColor(key)}
                accessibilityLabel={`${swatch.label} colour`}
                accessibilityState={{ selected }}
                // The ring uses the current note's ink so it shows on every paper,
                // including a swatch the same colour as the page.
                style={[
                  styles.swatch,
                  { backgroundColor: swatch.background, borderColor: tone.rule },
                  selected && { borderColor: tone.text },
                ]}
              >
                {selected && <Feather name="check" size={16} color={swatch.text} />}
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
  paper: {
    flexGrow: 1,
    paddingTop: PAPER_TOP,
    paddingBottom: LINE * 2,
    paddingLeft: MARGIN_X + 14,
    paddingRight: 20,
  },
  title: { fontSize: 22, lineHeight: LINE, fontWeight: '800', padding: 0 },
  meta: { fontSize: 12, lineHeight: LINE },
  body: { fontSize: 17, lineHeight: LINE, padding: 0 },
  palette: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
