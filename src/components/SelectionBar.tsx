import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/lib/theme';

/** Replaces a list's title while items are selected: count, select all, delete, cancel. */
export function SelectionBar({
  count,
  total,
  onCancel,
  onSelectAll,
  onDelete,
}: {
  count: number;
  total: number;
  onCancel: () => void;
  onSelectAll: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={onCancel} hitSlop={10} accessibilityLabel="Cancel selection">
        <Feather name="x" size={22} color={colors.onPrimary} />
      </Pressable>
      <Text style={styles.count}>{count} selected</Text>
      {count < total && (
        <Pressable onPress={onSelectAll} hitSlop={8}>
          <Text style={styles.selectAll}>Select all</Text>
        </Pressable>
      )}
      <Pressable
        onPress={onDelete}
        style={styles.delete}
        accessibilityLabel={`Delete ${count} selected`}
      >
        <Feather name="trash-2" size={18} color={colors.primary} />
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </View>
  );
}

/** Corner badge on a selected row/card. */
export function SelectedBadge() {
  return (
    <View style={styles.badge}>
      <Feather name="check" size={14} color={colors.onPrimary} />
    </View>
  );
}

/** Style for a row/card while it's selected. */
export const selectedStyle = {
  borderWidth: 2,
  borderColor: colors.primary,
} as const;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.chrome,
  },
  count: { flex: 1, color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
  selectAll: { color: colors.gold, fontSize: 14, fontWeight: '600' },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  deleteText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
