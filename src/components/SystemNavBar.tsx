import { NavigationBar } from 'expo-navigation-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

/**
 * Android draws the app edge to edge, so the phone's back/home/recents buttons sit directly
 * on top of the app. On a light (cream) screen the white buttons disappear. This puts a
 * solid black bar behind them (matching the app's black tab bar) and keeps them white.
 * Render it last so it stays on top; it ignores touches. No-op on iOS and web.
 */
export function SystemNavBar() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android') return null;
  return (
    <>
      <NavigationBar style="light" />
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.backdrop, { height: insets.bottom }]} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.chrome,
    zIndex: 1000,
    elevation: 1000,
  },
});
