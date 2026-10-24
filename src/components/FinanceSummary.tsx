import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { budgetLeft, type BudgetStatus, type CategoryTotal, type Direction } from '@/db/types';
import { categoryIcon } from '@/lib/categories';
import { formatMoney } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

import { BudgetBar, budgetColor, budgetRange } from './Budget';
import { Text } from './Text';

interface Row {
  category: string;
  totalCents: number;
  budgets: BudgetStatus[];
}

/**
 * Finances "Summary" view: each category's total for the period, largest first, as a share
 * of all income or spending. Expense categories with a budget show its progress instead:
 * how much of it is used, and what's left (or how far over).
 */
export function FinanceSummary({
  direction,
  totals,
  budgets,
  emptyTitle,
  onAddBudget,
  onOpenBudget,
}: {
  direction: Direction;
  totals: CategoryTotal[];
  /** Budgets overlapping the period, with their spending. */
  budgets: BudgetStatus[];
  emptyTitle: string;
  /** A new budget for this category. */
  onAddBudget: (category: string) => void;
  onOpenBudget: (id: number) => void;
}) {
  const expense = direction === 'expense';
  const grand = totals.reduce((sum, t) => sum + t.totalCents, 0);

  const rows: Row[] = totals.map((t) => ({ ...t, budgets: [] }));
  if (expense) {
    for (const b of budgets) {
      let row = rows.find((r) => r.category === b.category);
      if (!row) {
        // A budget with nothing spent yet still shows, after the categories with spending.
        row = { category: b.category, totalCents: 0, budgets: [] };
        rows.push(row);
      }
      row.budgets.push(b);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      {rows.length === 0 && (
        <View style={styles.empty}>
          <Feather name="pie-chart" size={28} color={colors.grey} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        </View>
      )}

      {rows.map((row) => {
        const share = grand > 0 ? row.totalCents / grand : 0;
        return (
          <View key={row.category} style={styles.card}>
            <View style={styles.titleRow}>
              <View
                style={[styles.icon, { backgroundColor: expense ? colors.expenseSoft : colors.incomeSoft }]}
              >
                <Text style={{ fontSize: 18 }}>{categoryIcon(direction, row.category)}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {row.category}
              </Text>
              <Text
                style={[
                  styles.total,
                  { color: expense ? colors.expense : colors.income },
                ]}
              >
                {formatMoney(row.totalCents)}
              </Text>
            </View>

            {row.budgets.length === 0 ? (
              <View style={{ gap: 6 }}>
                <BudgetBar fraction={share} color={expense ? colors.grey : colors.income} />
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>
                    {Math.round(share * 100)}% of {expense ? 'spending' : 'income'}
                  </Text>
                  {expense && (
                    <Pressable onPress={() => onAddBudget(row.category)} hitSlop={8}>
                      <Text style={styles.link}>Set budget</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : (
              row.budgets.map((b) => <BudgetLine key={b.id} budget={b} onPress={() => onOpenBudget(b.id)} />)
            )}
          </View>
        );
      })}
    </View>
  );
}

function BudgetLine({ budget, onPress }: { budget: BudgetStatus; onPress: () => void }) {
  const used = budget.spentCents / budget.amountCents;
  const left = budgetLeft(budget);
  const color = budgetColor(used);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ gap: 6 }, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${budget.subcategory ?? budget.category} budget`}
    >
      <View style={styles.metaRow}>
        <Text style={styles.budgetLabel} numberOfLines={1}>
          {budget.subcategory ? `${budget.subcategory} budget` : 'Budget'} ·{' '}
          {budgetRange(budget)}
        </Text>
        <Text style={styles.meta}>
          {formatMoney(budget.spentCents)} / {formatMoney(budget.amountCents)}
        </Text>
      </View>
      <BudgetBar fraction={Math.min(used, 1)} color={color} />
      <View style={styles.metaRow}>
        <Text style={[styles.percent, { color: left < 0 ? colors.danger : colors.text }]}>
          {Math.round(used * 100)}% used
        </Text>
        <Text style={[styles.leftText, left < 0 && { color: colors.danger }]}>
          {left < 0 ? `${formatMoney(-left)} over budget` : `${formatMoney(left)} left`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  total: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { fontSize: 12, color: colors.muted, fontVariant: ['tabular-nums'] },
  link: { fontSize: 12, fontWeight: '700', color: colors.primary },
  budgetLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text },
  percent: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  leftText: { fontSize: 13, fontWeight: '600', color: colors.income, fontVariant: ['tabular-nums'] },
});
