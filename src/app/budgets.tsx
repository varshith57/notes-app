import { router, Stack, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BudgetBar, BudgetCard, budgetColor, BudgetIcon } from '@/components/Budget';
import { Text } from '@/components/Text';
import { EmptyState, Fab, Segmented, webHeaderLeft } from '@/components/ui';
import { listBudgetStatuses } from '@/db/budgetsRepo';
import { budgetLeft, type BudgetStatus } from '@/db/types';
import { onDataChanged } from '@/lib/dataEvents';
import { formatMoney, todayISO } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

type Tab = 'active' | 'upcoming' | 'ended';

const ALL_TIME = { from: '0000-01-01', to: '9999-12-31' };

const EMPTY: Record<Tab, { title: string; hint: string }> = {
  active: { title: 'No budgets running now', hint: 'Tap + to set a spending limit for a category.' },
  upcoming: { title: 'Nothing scheduled', hint: 'Budgets that start later show up here.' },
  ended: { title: 'No past budgets', hint: 'Finished budgets stay here so you can look back.' },
};

/**
 * Every budget, split into running now, starting later and finished. Running budgets are
 * listed most-used first (the ones needing attention on top). Tap one to edit or delete it.
 */
export default function BudgetsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [tab, setTab] = useState<Tab>('active');

  useFocusEffect(
    useCallback(() => {
      const load = async () => setBudgets(await listBudgetStatuses(db, ALL_TIME));
      load();
      return onDataChanged('finance', load);
    }, [db]),
  );

  const today = todayISO();
  const groups = useMemo(() => {
    const used = (b: BudgetStatus) => b.spentCents / b.amountCents;
    return {
      active: budgets
        .filter((b) => b.startOn <= today && b.endOn >= today)
        .sort((a, b) => used(b) - used(a)),
      upcoming: budgets.filter((b) => b.startOn > today).sort((a, b) => a.startOn.localeCompare(b.startOn)),
      ended: budgets.filter((b) => b.endOn < today).sort((a, b) => b.endOn.localeCompare(a.endOn)),
    };
  }, [budgets, today]);

  const active = groups.active;
  const totalBudget = active.reduce((s, b) => s + b.amountCents, 0);
  const totalSpent = active.reduce((s, b) => s + b.spentCents, 0);
  const onTrack = active.filter((b) => budgetLeft(b) >= 0).length;
  const used = totalBudget ? totalSpent / totalBudget : 0;

  const add = () => router.push({ pathname: '/budget/[id]', params: { id: 'new' } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: 'Budgets',
          headerLeft: webHeaderLeft('/finance'),
        }}
      />
      <FlatList
        data={groups[tab]}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 16 }}>
            <View style={styles.overview}>
              <Text style={styles.overviewLabel}>Running now</Text>
              {active.length ? (
                <>
                  <Text style={styles.overviewValue}>
                    {formatMoney(totalSpent)}
                    <Text style={styles.overviewOf}> of {formatMoney(totalBudget)}</Text>
                  </Text>
                  <BudgetBar fraction={used} color={budgetColor(used)} height={10} />
                  <View style={styles.overviewRow}>
                    <Text style={styles.overviewMeta}>
                      {onTrack} of {active.length} on track
                    </Text>
                    <Text style={styles.overviewMeta}>
                      {totalBudget - totalSpent < 0
                        ? `${formatMoney(totalSpent - totalBudget)} over in total`
                        : `${formatMoney(totalBudget - totalSpent)} left in total`}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.overviewMeta}>
                  Set a limit for a category and watch how much is left as you spend.
                </Text>
              )}
            </View>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'active', label: `Active (${groups.active.length})` },
                { value: 'upcoming', label: `Upcoming (${groups.upcoming.length})` },
                { value: 'ended', label: `Ended (${groups.ended.length})` },
              ]}
            />
          </View>
        }
        renderItem={({ item }) => (
          <BudgetCard
            budget={item}
            onPress={() => router.push({ pathname: '/budget/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={<EmptyState
            icon={<BudgetIcon size={28} color={colors.primary} />}
            title={EMPTY[tab].title}
            hint={EMPTY[tab].hint}
          />}
      />
      <Fab label="New budget" bottom={insets.bottom + 24} onPress={add} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20 },
  overview: { backgroundColor: colors.chrome, borderRadius: radius.lg, padding: 18, gap: 10 },
  overviewLabel: { color: colors.gold, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  overviewValue: { color: colors.surface, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  overviewOf: { color: colors.grey, fontSize: 16, fontWeight: '600' },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  overviewMeta: { color: colors.grey, fontSize: 13, fontVariant: ['tabular-nums'] },
});
