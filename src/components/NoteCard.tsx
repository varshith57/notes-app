import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Note } from '@/db/types';
import { SELECT_HOLD_MS } from '@/hooks/useSelection';
import { formatTimestamp } from '@/lib/format';
import { colors, noteTone, radius } from '@/lib/theme';

import { SelectedBadge, selectedStyle } from './SelectionBar';
import { Text } from './Text';

export function NoteCard({
  note,
  onPress,
  onLongPress,
  selected = false,
}: {
  note: Note;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
}) {
  const tone = noteTone(note.color);
  const preview = note.body.trim();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={SELECT_HOLD_MS}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tone.background },
        selected && selectedStyle,
        pressed && { opacity: 0.8 },
      ]}
    >
      {selected && <SelectedBadge />}
      <View style={styles.header}>
        <Text
          style={[styles.title, { color: tone.text }]}
          numberOfLines={1}
        >
          {note.title || preview.split('\n')[0] || 'Untitled'}
        </Text>
        {note.pinned && <Feather name="bookmark" size={16} color={tone.accent} />}
      </View>
      {!!preview && !!note.title && (
        <Text
          style={[
            styles.body,
            { color: tone.muted },
          ]}
          numberOfLines={3}
        >
          {preview}
        </Text>
      )}
      <View style={[styles.pill, { backgroundColor: tone.accent }]}>
        <Feather name="calendar" size={11} color={tone.onAccent} />
        <Text style={[styles.pillText, { color: tone.onAccent }]}>
          {formatTimestamp(note.updatedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 18,
    gap: 8,
    // Keeps the cream card distinct from the white page.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 4,
  },
  pillText: { fontSize: 11, fontWeight: '600' },
});
