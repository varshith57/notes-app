import { Image, Pressable, StyleSheet, View } from 'react-native';

import { budgetLeft, type BudgetStatus } from '@/db/types';
import { categoryIcon } from '@/lib/categories';
import { formatMoney, fromISODate, todayISO } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

import { Text } from './Text';

// Shared pieces for showing budgets: the progress bar and its colours, a full card (Budgets
// screen) and a compact row (Finances overview).

/**
 * Budgets icon: a money bag with a calculator in front. A tinted silhouette (rendered by
 * scripts/generate-icons.mjs) with transparent details, so it works on any background.
 */
export function BudgetIcon({ size = 22, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Image
      source={require('../../assets/budget-icon.png')}
      style={{ width: size, height: size, tintColor: color }}
      accessible={false}
    />
  );
}

export const shortDate = (iso: string) =>
  fromISODate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export const budgetRange = (b: BudgetStatus) => `${shortDate(b.startOn)} – ${shortDate(b.endOn)}`;

export const budgetUsed = (b: BudgetStatus) => b.spentCents / b.amountCents;

/** Under 80% is on track, up to 100% is close to the limit, over 100% is over budget. */
export function budgetColor(used: number): string {
  if (used > 1) return colors.danger;
  if (used >= 0.8) return colors.goldDark;
  return colors.income;
}

export function budgetStatus(b: BudgetStatus): { label: string; color: string; bg: string } {
  const used = budgetUsed(b);
  if (used > 1) return { label: 'Over budget', color: colors.danger, bg: colors.expenseSoft };
  if (used >= 0.8) return { label: 'Close to limit', color: colors.goldDark, bg: colors.goldSoft };
  return { label: 'On track', color: colors.income, bg: colors.incomeSoft };
}

/** "750 left" / "250 over". */
export function leftLabel(b: BudgetStatus): string {
  const left = budgetLeft(b);
  return left < 0 ? `${formatMoney(-left)} over` : `${formatMoney(left)} left`;
}

/** Days remaining in an active budget, today included. */
function daysLeft(b: BudgetStatus): number {
  const end = fromISODate(b.endOn).getTime();
  const today = fromISODate(todayISO()).getTime();
  return Math.round((end - today) / 86_400_000) + 1;
}

export function BudgetBar({ fraction, color, height = 8 }: { fraction: number; color: string; height?: number }) {
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          height,
          borderRadius: height / 2,
          width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

const nameOf = (b: BudgetStatus) => b.subcategory ?? b.category;

/** Full budget card: what it covers, its dates, status, progress and what's left. */
export function BudgetCard({ budget, onPress }: { budget: BudgetStatus; onPress: () => void }) {
  const used = budgetUsed(budget);
  const status = budgetStatus(budget);
  const today = todayISO();
  const timing =
    budget.startOn > today
      ? `Starts ${shortDate(budget.startOn)}`
      : budget.endOn < today
        ? 'Ended'
        : `${daysLeft(budget)} day${daysLeft(budget) === 1 ? '' : 's'} left`;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${nameOf(budget)} budget, ${status.label}, ${leftLabel(budget)}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.icon}>
          <Text style={{ fontSize: 20 }}>{categoryIcon('expense', budget.category)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {nameOf(budget)}
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {budget.subcategory ? `${budget.category} · ` : ''}
            {budgetRange(budget)} · {timing}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: status.bg }]}>
          <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <BudgetBar fraction={used} color={budgetColor(used)} />
      <View style={styles.cardBottom}>
        <Text style={styles.amounts}>
          <Text style={styles.spent}>{formatMoney(budget.spentCents)}</Text> of{' '}
          {formatMoney(budget.amountCents)} · {Math.round(used * 100)}%
        </Text>
        <Text style={[styles.left, { color: budgetLeft(budget) < 0 ? colors.danger : colors.income }]}>
          {leftLabel(budget)}
        </Text>
      </View>
    </Pressable>
  );
}

/** Compact budget row for the Finances overview card. */
export function BudgetMiniRow({ budget, onPress }: { budget: BudgetStatus; onPress: () => void }) {
  const used = budgetUsed(budget);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ gap: 6 }, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`${nameOf(budget)} budget, ${leftLabel(budget)}`}
    >
      <View style={styles.miniTop}>
        <Text style={{ fontSize: 15 }}>{categoryIcon('expense', budget.category)}</Text>
        <Text style={styles.miniName} numberOfLines={1}>
          {nameOf(budget)}
        </Text>
        <Text style={[styles.miniLeft, { color: budgetLeft(budget) < 0 ? colors.danger : colors.text }]}>
          {leftLabel(budget)}
        </Text>
      </View>
      <BudgetBar fraction={used} color={budgetColor(used)} height={6} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.border, overflow: 'hidden' },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.expenseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  chipText: { fontSize: 11, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  amounts: { flexShrink: 1, fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  spent: { fontWeight: '700', color: colors.text },
  left: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  miniTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  miniLeft: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
