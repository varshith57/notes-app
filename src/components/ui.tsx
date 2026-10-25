import { Feather } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { leaveTo } from '@/lib/dialogs';
import { colors, gradient, progressGradient, radius } from '@/lib/theme';

import { Text } from './Text';

type IconName = keyof typeof Feather.glyphMap;

export function ScreenTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        {/* One line: shrinks at large text sizes rather than breaking mid-word. */}
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {title}
        </Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

/** Round outlined icon button, as in the reference header (search / bell). */
export function IconButton({
  icon,
  onPress,
  label,
  active,
  children,
}: {
  icon?: IconName;
  onPress: () => void;
  label: string;
  active?: boolean;
  /** A custom icon in place of `icon`. */
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        active && { backgroundColor: colors.chrome, borderColor: colors.chrome },
        pressed && { opacity: 0.6 },
      ]}
    >
      {children ?? (icon && <Feather name={icon} size={20} color={active ? colors.onPrimary : colors.text} />)}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  onLongPress,
  color = colors.primary,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  color?: string;
  icon?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
      ]}
    >
      {!!icon && <Text style={{ fontSize: 14 }}>{icon}</Text>}
      <Text style={[styles.chipText, selected && { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
            // Stable id for end-to-end tests (labels can repeat elsewhere on screen).
            testID={`segment-${o.value}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            {o.icon && (
              <Feather name={o.icon} size={15} color={selected ? colors.primary : colors.muted} />
            )}
            {/* Shrinks rather than overflowing at large text sizes. */}
            <Text
              style={[styles.segmentText, selected && { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GradientProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressTrack}>
      <LinearGradient
        colors={progressGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progressFill, { width: `${pct * 100}%` }]}
      />
    </View>
  );
}

export function Fab({ onPress, label, bottom }: { onPress: () => void; label: string; bottom: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fabInner}
      >
        <Feather name="plus" size={26} color={colors.onPrimary} />
      </LinearGradient>
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  /** A Feather icon name, or a custom icon. */
  icon: IconName | ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        {typeof icon === 'string' ? (
          <Feather name={icon as IconName} size={26} color={colors.primary} />
        ) : (
          icon
        )}
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );
}

/**
 * Web-only header back arrow for editors. In the browser an editor can be reloaded or
 * opened by URL with no history, where the stack shows no arrow at all, and whether
 * history exists isn't reliable at render time. So decide on tap: go back when
 * possible, otherwise to `fallback`. Phones keep the native back button and swipe.
 */
export function webHeaderLeft(fallback: Href, color: string = colors.text) {
  if (Platform.OS !== 'web') return undefined;
  return function WebBackButton() {
    return (
      <Pressable
        onPress={() => leaveTo(fallback)}
        hitSlop={10}
        accessibilityLabel="Back"
        style={{ paddingHorizontal: 12 }}
      >
        <Feather name="arrow-left" size={22} color={color} />
      </Pressable>
    );
  };
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={styles.sectionLabel}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.text },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  segmentText: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.muted },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyHint: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.muted, letterSpacing: 0.3 },
});
