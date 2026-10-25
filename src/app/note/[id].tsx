import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
// The paper's own text scales with the ruled-line grid below, so it uses React Native's
// Text / TextInput directly rather than the app's auto-scaled ones.
import {
  Pressable,
  Text as PaperText,
  TextInput as PaperInput,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RuledPaper } from '@/components/RuledPaper';
import { Text } from '@/components/Text';
import { webHeaderLeft } from '@/components/ui';
import { createNote, deleteNote, getNote, updateNote } from '@/db/notesRepo';
import type { NoteInput } from '@/db/types';
import { emitDataChanged } from '@/lib/dataEvents';
import { confirmDestructive, leaveTo } from '@/lib/dialogs';
import { formatTimestamp } from '@/lib/format';
import { scaled, useTextScale } from '@/lib/textScale';
import {
  DEFAULT_NOTE_COLOR,
  NOTE_COLOR_KEYS,
  NOTE_COLORS,
  noteTone,
  type NoteColor,
} from '@/lib/theme';

const AUTOSAVE_MS = 400;

// Ruled-paper grid: every text row is one line tall so writing sits on the rules. Sizes are
// for the default text size; the A−/A+ setting scales the text and the grid together.
const BASE_LINE = 32;
const PAPER_TOP = 16;
const MARGIN_X = 40;
/** Gap between a line of text's baseline and the rule under it. */
const RULE_BELOW_BASELINE = 4;
/**
 * Where the rule sits inside each row. Platforms place text differently within a line
 * height (web and Android centre it, iOS puts it at the bottom), so on phones it's measured
 * from the real text layout; this is the web value (onTextLayout isn't available there).
 */
const BASE_RULE_IN_ROW = 26;
/** Height of the pin/colour bar while it sits on the keyboard (keeps the caret clear of it). */
const PALETTE_HEIGHT = 60;

/**
 * Distraction-free editor. Saves automatically as you type; an empty note is
 * discarded when you leave. No length limit on title or body.
 */
export default function NoteEditorScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();

  const isNew = params.id === 'new';
  const idRef = useRef<number | null>(isNew ? null : Number(params.id));
  // Mirrors idRef for rendering (Delete only shows once the note exists in the database).
  const [exists, setExists] = useState(!isNew);
  const [loaded, setLoaded] = useState(isNew);
  // Mirrors `loaded` for the unmount cleanup, which only sees the first render's state.
  const loadedRef = useRef(loaded);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<NoteColor>(DEFAULT_NOTE_COLOR);
  const [pinned, setPinned] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [titleHeight, setTitleHeight] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);
  const scale = useTextScale();
  const LINE = Math.round(BASE_LINE * scale);
  /** Whole rows for a measured text height (tolerates sub-pixel rounding). */
  const rows = (h: number) => Math.max(1, Math.round(h / LINE));
  // The text boxes must never be shorter than their text, not even by a pixel: on Android a
  // multiline box that can scroll itself keeps every touch, so the page underneath won't
  // scroll (the "frozen" editor). The title is clamped to its text height; the body gets a
  // spare ruled line below the text.
  const titleBoxHeight = Math.max(rows(titleHeight) * LINE, Math.ceil(titleHeight));
  const bodyBoxHeight = Math.max(12 * LINE, (Math.ceil(bodyHeight / LINE - 0.05) + 1) * LINE);
  // Measured rule position on phones (see the hidden sample below); scaled default on web.
  const [measuredRule, setMeasuredRule] = useState<{ scale: number; y: number } | null>(null);
  const ruleInRow =
    measuredRule?.scale === scale ? measuredRule.y : Math.round(BASE_RULE_IN_ROW * scale);
  const textSizes = {
    title: { fontSize: scaled(22, scale), lineHeight: LINE },
    meta: { fontSize: scaled(12, scale), lineHeight: LINE },
    body: { fontSize: scaled(17, scale), lineHeight: LINE },
  };

  const blank: NoteInput = { title: '', body: '', color: DEFAULT_NOTE_COLOR, pinned: false };
  // Latest field values for the debounced save and the unmount flush (kept in sync below,
  // before the autosave effect runs).
  const latest = useRef<NoteInput>(blank);
  useEffect(() => {
    latest.current = { title, body, color, pinned };
  }, [title, body, color, pinned]);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const dirty = useRef(false);
  // Snapshot of what's in the database, so merely opening a note doesn't re-save it
  // (which would bump its "edited" date).
  const saved = useRef(JSON.stringify(blank));

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
        if (!empty) {
          idRef.current = await createNote(db, input);
          setExists(true);
        }
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

  // Explicit save (in addition to autosave on back): write now, then close.
  const saveAndClose = async () => {
    persist();
    await saving.current;
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
              {exists && (
                <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete note">
                  <Feather name="trash-2" size={21} color={tone.muted} />
                </Pressable>
              )}
              <Pressable
                onPress={saveAndClose}
                style={[styles.saveButton, { backgroundColor: tone.accent }]}
                accessibilityRole="button"
                accessibilityLabel="Save note"
              >
                <Text style={[styles.saveText, { color: tone.onAccent }]}>Save</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      {/* Follows the caret while typing so the line being written stays above the keyboard
          and the colour bar on top of it; the extra keyboard space keeps the whole note
          scrollable while the keyboard is open. */}
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={PALETTE_HEIGHT + LINE}
      >
        <RuledPaper
          style={[styles.paper, { paddingBottom: LINE * 2 }]}
          lineHeight={LINE}
          firstRule={PAPER_TOP + ruleInRow}
          marginX={MARGIN_X}
          lineColor={tone.rule}
          marginColor={tone.margin}
        >
          {/* Invisible one-line sample in the body style: its layout tells us where this
              phone draws the baseline inside a row, so the rules land right under the text. */}
          <PaperText
            key={scale}
            style={[styles.body, textSizes.body, styles.measure]}
            onTextLayout={(e) => {
              const line = e.nativeEvent.lines[0];
              if (line) {
                setMeasuredRule({
                  scale,
                  y: Math.round(line.y + line.ascender + RULE_BELOW_BASELINE),
                });
              }
            }}
            aria-hidden
            accessible={false}
          >
            Ag
          </PaperText>
          <PaperInput
            style={[
              styles.title,
              textSizes.title,
              { color: tone.text, height: titleBoxHeight },
            ]}
            placeholder="Title"
            placeholderTextColor={tone.placeholder}
            value={title}
            onChangeText={setTitle}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            onContentSizeChange={(e) => setTitleHeight(e.nativeEvent.contentSize.height)}
          />
          {updatedAt && (
            <PaperText style={[styles.meta, textSizes.meta, { color: tone.muted }]}>
              Edited {formatTimestamp(updatedAt)}
            </PaperText>
          )}
          <PaperInput
            style={[
              styles.body,
              textSizes.body,
              { color: tone.text, height: bodyBoxHeight },
            ]}
            placeholder="Start writing…"
            placeholderTextColor={tone.placeholder}
            value={body}
            onChangeText={setBody}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            autoFocus={isNew}
            onContentSizeChange={(e) => setBodyHeight(e.nativeEvent.contentSize.height)}
          />
        </RuledPaper>
      </KeyboardAwareScrollView>

      <KeyboardStickyView
        offset={{ opened: Math.max(insets.bottom, 12) - 12 }}
        style={[
          styles.palette,
          {
            backgroundColor: tone.background,
            borderTopColor: tone.rule,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <Pressable
          onPress={() => setPinned((p) => !p)}
          style={[styles.pin, { borderColor: pinned ? tone.accent : tone.rule }]}
          accessibilityRole="switch"
          accessibilityState={{ checked: pinned }}
          accessibilityLabel="Pin to top"
        >
          <Feather name="bookmark" size={16} color={pinned ? tone.accent : tone.muted} />
          <Text style={[styles.pinText, { color: pinned ? tone.accent : tone.muted }]}>
            {pinned ? 'Pinned' : 'Pin'}
          </Text>
        </Pressable>
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
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 4 },
  saveButton: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  saveText: { fontSize: 15, fontWeight: '700' },
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  pinText: { fontSize: 13, fontWeight: '700' },
  paper: {
    flexGrow: 1,
    paddingTop: PAPER_TOP,
    paddingLeft: MARGIN_X + 14,
    paddingRight: 20,
  },
  // includeFontPadding: Android otherwise adds font padding above/below the text, which
  // pushes every line off the grid.
  title: { fontWeight: '800', padding: 0, includeFontPadding: false },
  meta: { includeFontPadding: false },
  body: { padding: 0, includeFontPadding: false },
  measure: { position: 'absolute', opacity: 0, left: 0, top: 0 },
  palette: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
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
