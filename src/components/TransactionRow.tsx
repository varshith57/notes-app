import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Transaction } from '@/db/types';
import { categoryIcon } from '@/lib/categories';
import { formatMoney } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

export function TransactionRow({ tx, onPress }: { tx: Transaction; onPress: () => void }) {
  const income = tx.direction === 'income';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
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
      <Text style={[styles.amount, { color: income ? colors.income : colors.expense }]}>
        {income ? '+' : '−'}
        {formatMoney(tx.amountCents)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
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
  amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
