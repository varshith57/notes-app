import { Pressable, StyleSheet, View } from 'react-native';

import type { Transaction } from '@/db/types';
import { SELECT_HOLD_MS } from '@/hooks/useSelection';
import { categoryIcon } from '@/lib/categories';
import { formatMoney } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

import { SelectedBadge, selectedStyle } from './SelectionBar';
import { Text } from './Text';

export function TransactionRow({
  tx,
  onPress,
  onLongPress,
  selected = false,
  budgetLeftCents,
}: {
  tx: Transaction;
  /** For an expense that counts against a budget: what's left of it (negative = over). */
  budgetLeftCents?: number | null;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
}) {
  const income = tx.direction === 'income';
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={SELECT_HOLD_MS}
      style={({ pressed }) => [styles.row, selected && selectedStyle, pressed && { opacity: 0.7 }]}
    >
      {selected && <SelectedBadge />}
      <View style={[styles.icon, { backgroundColor: income ? colors.incomeSoft : colors.expenseSoft }]}>
        <Text style={{ fontSize: 20 }}>{categoryIcon(tx.direction, tx.category)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {tx.subcategory ?? tx.category}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[tx.subcategory ? tx.category : null, tx.note || null].filter(Boolean).join(' · ') ||
            (income ? 'Income' : 'Expense')}
        </Text>
      </View>
      <View style={styles.amountColumn}>
        <Text
          style={[
            styles.amount,
            { color: income ? colors.income : colors.expense },
          ]}
        >
          {income ? '+' : '−'}
          {formatMoney(tx.amountCents)}
        </Text>
        {budgetLeftCents != null && (
          <Text
            style={[
              styles.left,
              budgetLeftCents < 0 && { color: colors.danger },
            ]}
          >
            {budgetLeftCents < 0
              ? `${formatMoney(-budgetLeftCents)} over`
              : `${formatMoney(budgetLeftCents)} left`}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    // Transparent border reserves space so selecting doesn't shift the layout.
    borderWidth: 2,
    borderColor: 'transparent',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  amountColumn: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  left: { fontSize: 11, fontWeight: '600', color: colors.muted, fontVariant: ['tabular-nums'] },
});
