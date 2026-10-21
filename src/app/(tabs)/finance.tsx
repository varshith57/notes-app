import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/DateTimeField';
import { PeriodPicker } from '@/components/PeriodPicker';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { SelectionBar } from '@/components/SelectionBar';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState, Fab, ScreenTitle, Segmented } from '@/components/ui';
import {
  deleteTransactions,
  getEarliestDate,
  getFinanceSummary,
  listTransactions,
} from '@/db/financeRepo';
import type { Direction, FinanceSummary, Transaction } from '@/db/types';
import { useSelection } from '@/hooks/useSelection';
import { emitDataChanged, onDataChanged } from '@/lib/dataEvents';
import { confirmDestructive } from '@/lib/dialogs';
import { formatDay, formatMoney, todayISO } from '@/lib/format';
import {
  PERIOD_LABELS,
  periodLabel,
  periodRange,
  shiftPeriod,
  type DateRange,
  type PeriodKind,
} from '@/lib/periods';
import { colors, radius } from '@/lib/theme';

type Filter = 'all' | Direction;

export default function FinanceScreen() {
  const db = useSQLiteContext();
  const today = todayISO();
  const [kind, setKind] = useState<PeriodKind>('month');
  const [range, setRange] = useState<DateRange>(() => periodRange('month', today));
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({ incomeCents: 0, expenseCents: 0 });
  const [earliest, setEarliest] = useState<string | null>(null);
  const selection = useSelection();
  const { clear: clearSelection } = selection;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setItems(await listTransactions(db, range, filter === 'all' ? undefined : filter));
        setSummary(await getFinanceSummary(db, range));
        setEarliest(await getEarliestDate(db));
      };
      load();
      const unsubscribe = onDataChanged('finance', load);
      // Leaving the tab or switching period/filter ends any selection.
      return () => {
        unsubscribe();
        clearSelection();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, range.from, range.to, filter, clearSelection]),
  );

  const deleteSelected = async () => {
    const ids = [...selection.selected];
    const label = ids.length === 1 ? 'this entry' : `${ids.length} entries`;
    if (!(await confirmDestructive(`Delete ${label}?`, 'This cannot be undone.'))) return;
    await deleteTransactions(db, ids);
    selection.clear();
    emitDataChanged('finance');
  };

  // Switching kind keeps you near the dates you were looking at (but never past today).
  const changeKind = (next: PeriodKind) => {
    setKind(next);
    if (next !== 'custom') setRange(periodRange(next, range.to < today ? range.to : today));
  };

  // Custom range: moving one end past the other drags the other end along.
  const setFrom = (from: string) => setRange((r) => ({ from, to: from > r.to ? from : r.to }));
  const setTo = (to: string) => setRange((r) => ({ from: to < r.from ? to : r.from, to }));

  // History goes back to the very first entry; forward stops at the current period.
  const canGoBack = earliest != null && earliest < range.from;
  const canGoForward = range.to < today;
  const label = periodLabel(kind, range);
  const unit = PERIOD_LABELS[kind].toLowerCase();

  const sections = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    for (const tx of items) byDay.set(tx.occurredOn, [...(byDay.get(tx.occurredOn) ?? []), tx]);
    return [...byDay].map(([day, data]) => ({ title: formatDay(day), data }));
  }, [items]);

  const net = summary.incomeCents - summary.expenseCents;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {selection.selecting && (
        <SelectionBar
          count={selection.selected.size}
          total={items.length}
          onCancel={selection.clear}
          onSelectAll={() => selection.selectAll(items.map((t) => t.id))}
          onDelete={deleteSelected}
        />
      )}
      <SectionList
        sections={sections}
        extraData={selection.selected}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 8 }}>
            <ScreenTitle
              title="Finances"
              subtitle="Income & expenses"
              right={<PeriodPicker value={kind} onChange={changeKind} />}
            />

            {kind === 'custom' ? (
              <View style={styles.customRow}>
                <View style={styles.customField}>
                  <Text style={styles.customLabel}>FROM</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <DateTimeField mode="date" value={range.from} onChange={setFrom} placeholder="From" />
                  </View>
                </View>
                <View style={styles.customField}>
                  <Text style={styles.customLabel}>TO</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <DateTimeField mode="date" value={range.to} onChange={setTo} placeholder="To" />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.periodRow}>
                <PeriodArrow
                  icon="chevron-left"
                  label={`Previous ${unit}`}
                  enabled={canGoBack}
                  onPress={() => setRange(shiftPeriod(kind, range.from, -1))}
                />
                {/* Tapping the label jumps back to the current period. */}
                <Pressable onPress={() => setRange(periodRange(kind, today))} style={{ flex: 1 }}>
                  <Text style={styles.period} numberOfLines={1} adjustsFontSizeToFit>
                    {label}
                  </Text>
                </Pressable>
                <PeriodArrow
                  icon="chevron-right"
                  label={`Next ${unit}`}
                  enabled={canGoForward}
                  onPress={() => setRange(shiftPeriod(kind, range.from, 1))}
                />
              </View>
            )}

            <LinearGradient
              colors={['#2A2224', colors.chrome]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroLabel}>Net balance</Text>
              {kind === 'custom' && <Text style={styles.heroRange}>{label}</Text>}
              <Text style={styles.heroValue}>
                {net < 0 ? '−' : ''}
                {formatMoney(Math.abs(net))}
              </Text>
              <View style={styles.heroStats}>
                <HeroStat icon="arrow-down-left" label="Income" value={summary.incomeCents} tint="#8FD3A9" />
                <HeroStat icon="arrow-up-right" label="Expense" value={summary.expenseCents} tint="#F2A097" />
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
            selected={selection.selected.has(item.id)}
            onPress={() =>
              selection.selecting
                ? selection.toggle(item.id)
                : router.push({ pathname: '/transaction/[id]', params: { id: item.id } })
            }
            onLongPress={() => selection.toggle(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="credit-card"
            title={kind === 'custom' ? 'Nothing in this date range' : `Nothing in ${label}`}
            hint="Tap + to log an income or expense."
          />
        }
      />
      {!selection.selecting && (
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
      )}
    </SafeAreaView>
  );
}

function PeriodArrow({
  icon,
  label,
  enabled,
  onPress,
}: {
  icon: 'chevron-left' | 'chevron-right';
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      hitSlop={8}
      style={[styles.arrow, !enabled && { opacity: 0.3 }]}
      accessibilityLabel={label}
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
      <View style={[styles.heroIcon, { backgroundColor: 'rgba(246,241,231,0.1)' }]}>
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
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  period: { textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },
  customRow: { flexDirection: 'row', gap: 10 },
  customField: { flex: 1, gap: 6 },
  customLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: colors.muted },
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
  heroLabel: { color: colors.gold, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  heroRange: { color: colors.grey, fontSize: 12, marginTop: 2 },
  heroValue: {
    color: colors.surface,
    fontSize: 34,
    fontWeight: '800',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  heroStats: { flexDirection: 'row', marginTop: 18, gap: 12 },
  heroStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  heroStatLabel: { color: colors.grey, fontSize: 12 },
  heroStatValue: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  day: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 16, marginBottom: 8 },
});
