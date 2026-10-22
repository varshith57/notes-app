import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/lib/theme';

/** "Sign in with Google" in the app's style (Google's brand guide allows a custom button
 *  with the "G" mark and this wording). */
export function GoogleButton({ onPress, busy }: { onPress: () => void; busy?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
    >
      <View style={styles.g}>
        <Text style={styles.gText}>G</Text>
      </View>
      <Text style={styles.label}>Sign in with Google</Text>
      {busy && <ActivityIndicator color={colors.onPrimary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  g: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gText: { fontSize: 16, fontWeight: '800', color: '#4285F4' },
  label: { fontSize: 16, fontWeight: '700', color: colors.onPrimary },
});
