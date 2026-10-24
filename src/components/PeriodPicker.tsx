import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PERIOD_LABELS, type PeriodKind } from '@/lib/periods';
import { colors, radius } from '@/lib/theme';

import { Text } from './Text';

const KINDS: PeriodKind[] = ['month', 'quarter', 'year', 'custom'];

/** "Month ▾" pill that opens a small "Summarize by" menu anchored at the top right. */
export function PeriodPicker({
  value,
  onChange,
}: {
  value: PeriodKind;
  onChange: (kind: PeriodKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.pill}
        accessibilityRole="button"
        accessibilityLabel={`Summarize by ${PERIOD_LABELS[value]}`}
      >
        <Text style={styles.pillText}>{PERIOD_LABELS[value]}</Text>
        <Feather name="chevron-down" size={16} color={colors.primary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        supportedOrientations={['portrait', 'landscape']}
      >
        {/* Tapping anywhere outside the menu closes it (Android back does too). */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close menu">
          <View style={[styles.menu, { top: insets.top + 64 }]}>
            <Text style={styles.menuTitle}>SUMMARIZE BY</Text>
            {KINDS.map((kind) => {
              const selected = kind === value;
              return (
                <Pressable
                  key={kind}
                  onPress={() => {
                    setOpen(false);
                    if (!selected) onChange(kind);
                  }}
                  style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surface }]}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.itemText, selected && styles.itemTextSelected]}>
                    {PERIOD_LABELS[kind]}
                  </Text>
                  {selected && <Feather name="check" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pillText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(26,26,26,0.3)' },
  menu: {
    position: 'absolute',
    right: 20,
    width: 200,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    shadowColor: colors.chrome,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.muted,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemText: { fontSize: 16, color: colors.text },
  itemTextSelected: { color: colors.primary, fontWeight: '700' },
});
