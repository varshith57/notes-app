import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Note } from '@/db/types';
import { formatTimestamp } from '@/lib/format';
import { colors, NOTE_COLORS, radius } from '@/lib/theme';

export function NoteCard({ note, onPress }: { note: Note; onPress: () => void }) {
  const palette = NOTE_COLORS[note.color] ?? NOTE_COLORS.lavender;
  const preview = note.body.trim();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.background },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {note.title || preview.split('\n')[0] || 'Untitled'}
        </Text>
        {note.pinned && <Feather name="bookmark" size={16} color={palette.accent} />}
      </View>
      {!!preview && !!note.title && (
        <Text style={styles.body} numberOfLines={3}>
          {preview}
        </Text>
      )}
      <View style={[styles.pill, { backgroundColor: palette.accent }]}>
        <Feather name="calendar" size={11} color={colors.onPrimary} />
        <Text style={styles.pillText}>{formatTimestamp(note.updatedAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: 18, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, lineHeight: 20, color: colors.muted },
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
  pillText: { color: colors.onPrimary, fontSize: 11, fontWeight: '600' },
});
