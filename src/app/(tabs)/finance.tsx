import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BudgetIcon, BudgetMiniRow, budgetUsed } from '@/components/Budget';
import { DateRangeField } from '@/components/DateRangeField';
import { FinanceSummary } from '@/components/FinanceSummary';
import { PeriodPicker } from '@/components/PeriodPicker';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { SelectionBar } from '@/components/SelectionBar';
import { Text } from '@/components/Text';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState, Fab, ScreenTitle, Segmented } from '@/components/ui';
import { budgetForTransaction, listBudgetStatuses } from '@/db/budgetsRepo';
import {
  deleteTransactions,
  getEarliestDate,
  getFinanceSummary,
  listCategoryTotals,
  listTransactions,
} from '@/db/financeRepo';
import {
  budgetLeft,
  type BudgetStatus,
  type CategoryTotal,
  type Direction,
  type FinanceSummary as Totals,
  type Transaction,
} from '@/db/types';
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
type View_ = 'all' | 'summary';

export default function FinanceScreen() {
  const db = useSQLiteContext();
  const today = todayISO();
  const [kind, setKind] = useState<PeriodKind>('month');
  const [range, setRange] = useState<DateRange>(() => periodRange('month', today));
  const [view, setView] = useState<View_>('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Totals>({ incomeCents: 0, expenseCents: 0 });
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [totals, setTotals] = useState<CategoryTotal[]>([]);
  // Summary compares one side at a time; "All" (both) only applies to the entry list.
  const summaryDirection: Direction = filter === 'income' ? 'income' : 'expense';
  const [earliest, setEarliest] = useState<string | null>(null);
  const selection = useSelection();
  const { clear: clearSelection } = selection;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (view === 'all') {
          setItems(await listTransactions(db, range, filter === 'all' ? undefined : filter));
        } else {
          setTotals(await listCategoryTotals(db, range, summaryDirection));
        }
        setBudgets(await listBudgetStatuses(db, range));
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
    }, [db, range.from, range.to, filter, view, clearSelection]),
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

  const changeView = (next: View_) => {
    setView(next);
    if (next === 'summary' && filter === 'all') setFilter('expense');
  };

  const openBudget = (params: { id: string; category?: string; from?: string; to?: string }) =>
    router.push({ pathname: '/budget/[id]', params });

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
        sections={view === 'all' ? sections : []}
        extraData={[selection.selected, budgets]}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 8 }}>
            <ScreenTitle
              title="Finances"
              subtitle="Income & expenses"
              right={
                <View style={styles.headerActions}>
                  {/* The icon itself is the button: no circle or border around it. */}
                  <Pressable
                    onPress={() => router.push('/budgets')}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Budgets"
                    style={({ pressed }) => [styles.budgetsButton, pressed && { opacity: 0.6 }]}
                  >
                    <BudgetIcon size={50} color={colors.chrome} />
                  </Pressable>
                  <PeriodPicker value={kind} onChange={changeKind} />
                </View>
              }
            />

            {kind === 'custom' ? (
              <DateRangeField value={range} onChange={setRange} label="Custom period" />
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
              colors={['#333333', colors.chrome]}
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

            <BudgetsOverview
              budgets={budgets}
              onOpen={(id) => openBudget({ id: String(id) })}
              onSeeAll={() => router.push('/budgets')}
              onAdd={() => openBudget({ id: 'new' })}
            />

            <Segmented
              value={view}
              onChange={changeView}
              options={[
                { value: 'all', label: 'All', icon: 'list' },
                { value: 'summary', label: 'Summary', icon: 'pie-chart' },
              ]}
            />
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                ...(view === 'all' ? [{ value: 'all' as const, label: 'All' }] : []),
                { value: 'income', label: 'Income', icon: 'trending-up' },
                { value: 'expense', label: 'Expense', icon: 'trending-down' },
              ]}
            />
          </View>
        }
        ListFooterComponent={
          view === 'summary' ? (
            <FinanceSummary
              direction={summaryDirection}
              totals={totals}
              budgets={budgets}
              emptyTitle={
                kind === 'custom'
                  ? `No ${summaryDirection} in this date range`
                  : `No ${summaryDirection} in ${label}`
              }
              onAddBudget={(category) =>
                openBudget({ id: 'new', category, from: range.from, to: range.to })
              }
              onOpenBudget={(id) => openBudget({ id: String(id) })}
            />
          ) : undefined
        }
        renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title}</Text>}
        renderItem={({ item }) => {
          const budget = budgetForTransaction(budgets, item);
          return (
          <TransactionRow
            tx={item}
            budgetLeftCents={budget ? budgetLeft(budget) : null}
            selected={selection.selected.has(item.id)}
            onPress={() =>
              selection.selecting
                ? selection.toggle(item.id)
                : router.push({ pathname: '/transaction/[id]', params: { id: item.id } })
            }
            onLongPress={() => selection.begin(item.id)}
          />
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          view === 'summary' ? undefined : (
          <EmptyState
            icon="credit-card"
            title={kind === 'custom' ? 'Nothing in this date range' : `Nothing in ${label}`}
            hint="Tap + to log an income or expense."
          />
          )
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

/** Most budgets listed on Finances before "See all". */
const OVERVIEW_LIMIT = 3;

/**
 * Budgets running in the period being viewed, most-used first, so you can see at a glance
 * how much is left wherever you are on Finances. Updates as entries are added.
 */
function BudgetsOverview({
  budgets,
  onOpen,
  onSeeAll,
  onAdd,
}: {
  budgets: BudgetStatus[];
  onOpen: (id: number) => void;
  onSeeAll: () => void;
  onAdd: () => void;
}) {
  if (!budgets.length) {
    return (
      <Pressable onPress={onAdd} style={styles.budgetsEmpty} accessibilityRole="button">
        <BudgetIcon size={20} color={colors.primary} />
        <Text style={styles.budgetsEmptyText}>Set a budget to see what’s left as you spend</Text>
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </Pressable>
    );
  }
  const sorted = [...budgets].sort((a, b) => budgetUsed(b) - budgetUsed(a));
  const onTrack = budgets.filter((b) => budgetLeft(b) >= 0).length;
  const more = budgets.length - OVERVIEW_LIMIT;
  return (
    <View style={styles.budgets}>
      <Pressable onPress={onSeeAll} style={styles.budgetsHeader} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text style={styles.budgetsTitle}>Budgets</Text>
          <Text style={styles.budgetsSub}>
            {onTrack} of {budgets.length} on track
          </Text>
        </View>
        <Text style={styles.seeAll}>{more > 0 ? `See all ${budgets.length}` : 'See all'}</Text>
        <Feather name="chevron-right" size={16} color={colors.primary} />
      </Pressable>
      {sorted.slice(0, OVERVIEW_LIMIT).map((b) => (
        <BudgetMiniRow key={b.id} budget={b} onPress={() => onOpen(b.id)} />
      ))}
    </View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  budgetsButton: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  budgets: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 14 },
  budgetsHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  budgetsTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  budgetsSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  seeAll: { fontSize: 13, fontWeight: '700', color: colors.primary },
  budgetsEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.grey,
  },
  budgetsEmptyText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  list: { padding: 20, paddingBottom: TAB_BAR_SPACE + 80 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  period: { textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },
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
