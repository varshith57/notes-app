import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '@/lib/theme';

import { SystemNavBar } from '../SystemNavBar';

/**
 * Bottom sheet for the themed pickers. Tapping the backdrop or the Android back button
 * cancels; only Done commits.
 */
export function Sheet({
  visible,
  title,
  onCancel,
  onDone,
  children,
}: {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onDone: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Cancel" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {children}
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancel} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onDone} style={styles.done} accessibilityRole="button">
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
      {/* The sheet extends behind the phone's buttons; keep them on their black bar. */}
      <SystemNavBar />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15,13,14,0.35)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { fontSize: 16, fontWeight: '600', color: colors.text },
  done: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  doneText: { fontSize: 16, fontWeight: '700', color: colors.onPrimary },
});
