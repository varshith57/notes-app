import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/TabBar';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState, Fab, ScreenTitle, Segmented } from '@/components/ui';
import { getEarliestMonth, getFinanceSummary, listTransactions } from '@/db/financeRepo';
import type { Direction, FinanceSummary, Transaction } from '@/db/types';
import { onDataChanged } from '@/lib/dataEvents';
import { formatDay, formatMoney, formatMonth, shiftMonth, todayISO } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

type Filter = 'all' | Direction;

export default function FinanceScreen() {
  const db = useSQLiteContext();
  const currentMonth = todayISO().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({ incomeCents: 0, expenseCents: 0 });
  const [earliest, setEarliest] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setItems(await listTransactions(db, month, filter === 'all' ? undefined : filter));
        setSummary(await getFinanceSummary(db, month));
        setEarliest(await getEarliestMonth(db));
      };
      load();
      return onDataChanged('finance', load);
    }, [db, month, filter]),
  );

  // History goes back to the very first entry; forward stops at the current month.
  const canGoBack = earliest != null && month > earliest;
  const canGoForward = month < currentMonth;

  const sections = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    for (const tx of items) byDay.set(tx.occurredOn, [...(byDay.get(tx.occurredOn) ?? []), tx]);
    return [...byDay].map(([day, data]) => ({ title: formatDay(day), data }));
  }, [items]);

  const net = summary.incomeCents - summary.expenseCents;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 8 }}>
            <ScreenTitle title="Finances" subtitle="Income & expenses, all in one place" />

            <View style={styles.monthRow}>
              <MonthArrow icon="chevron-left" enabled={canGoBack} onPress={() => setMonth(shiftMonth(month, -1))} />
              <Pressable onPress={() => setMonth(currentMonth)} style={{ flex: 1 }}>
                <Text style={styles.month}>{formatMonth(month)}</Text>
              </Pressable>
              <MonthArrow icon="chevron-right" enabled={canGoForward} onPress={() => setMonth(shiftMonth(month, 1))} />
            </View>

            <LinearGradient
              colors={['#2A1260', colors.navy]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroLabel}>Net balance</Text>
              <Text style={styles.heroValue}>
                {net < 0 ? '−' : ''}
                {formatMoney(Math.abs(net))}
              </Text>
              <View style={styles.heroStats}>
                <HeroStat icon="arrow-down-left" label="Income" value={summary.incomeCents} tint="#7EE2A8" />
                <HeroStat icon="arrow-up-right" label="Expense" value={summary.expenseCents} tint="#FF9DA0" />
              </View>
            </LinearGradient>

            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'income', label: 'Income', icon: 'trending-up' },
                { value: 'expense', label: 'Expense', icon: 'trending-down' },
              ]}
            />
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title}</Text>}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="credit-card"
            title={`Nothing in ${formatMonth(month)}`}
            hint="Tap + to log an income or expense."
          />
        }
      />
      <Fab
        label="Add financial note"
        bottom={TAB_BAR_SPACE}
        onPress={() =>
          router.push({
            pathname: '/transaction/[id]',
            params: { id: 'new', direction: filter === 'income' ? 'income' : 'expense' },
          })
        }
      />
    </SafeAreaView>
  );
}

function MonthArrow({
  icon,
  enabled,
  onPress,
}: {
  icon: 'chevron-left' | 'chevron-right';
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      hitSlop={8}
      style={[styles.arrow, !enabled && { opacity: 0.3 }]}
      accessibilityLabel={icon === 'chevron-left' ? 'Previous month' : 'Next month'}
    >
      <Feather name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

function HeroStat({
  icon,
  label,
  value,
  tint,
}: {
  icon: 'arrow-down-left' | 'arrow-up-right';
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <View style={styles.heroStat}>
      <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
        <Feather name={icon} size={16} color={tint} />
      </View>
      <View>
        <Text style={styles.heroStatLabel}>{label}</Text>
        <Text style={[styles.heroStatValue, { color: tint }]}>{formatMoney(value)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20, paddingBottom: TAB_BAR_SPACE + 80 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  month: { textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { borderRadius: radius.lg, padding: 20 },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  heroValue: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  heroStats: { flexDirection: 'row', marginTop: 18, gap: 12 },
  heroStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  heroStatValue: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  day: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 16, marginBottom: 8 },
});
