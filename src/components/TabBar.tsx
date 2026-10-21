import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradient, radius } from '@/lib/theme';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: 'home',
  notes: 'file-text',
  finance: 'credit-card',
  tasks: 'check-square',
};

/** Height the floating bar occupies, so scroll content can pad past it. */
export const TAB_BAR_SPACE = 110;

/** Floating deep-navy pill; the active tab expands into a gradient chip with its label. */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key].options.title ?? route.name;
          const icon = ICONS[route.name] ?? 'circle';

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          if (focused) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: true }}
                style={styles.activeTab}
              >
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeIcon}
                >
                  <Feather name={icon} size={18} color={colors.onPrimary} />
                </LinearGradient>
                <Text style={styles.activeLabel} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityLabel={label}
              style={styles.tab}
            >
              <Feather name={icon} size={20} color={colors.grey} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.chrome,
    borderRadius: radius.pill,
    padding: 6,
    shadowColor: colors.chrome,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  tab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(179,167,160,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    padding: 4,
    paddingRight: 16,
    gap: 8,
    flexShrink: 1,
  },
  activeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
