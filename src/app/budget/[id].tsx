import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateRangeField } from '@/components/DateRangeField';
import { Text, TextInput } from '@/components/Text';
import { Chip, SectionLabel, webHeaderLeft } from '@/components/ui';
import { createBudget, deleteBudget, getBudget, updateBudget } from '@/db/budgetsRepo';
import { listCustomSubcategories, type CustomSubcategory } from '@/db/subcategoriesRepo';
import { useStableCallback } from '@/hooks/useStableCallback';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { CATEGORIES, findCategory } from '@/lib/categories';
import { emitDataChanged } from '@/lib/dataEvents';
import { confirmDestructive, leaveTo, showMessage } from '@/lib/dialogs';
import {
  centsToInput,
  formatAmountInput,
  fromISODate,
  parseMoneyToCents,
  todayISO,
  toISODate,
} from '@/lib/format';
import { colors, gradient, radius } from '@/lib/theme';

/** Height of the Save bar while it sits on the keyboard, for keeping the caret clear of it. */
const FOOTER_HEIGHT = 78;

/** Default range: today until the day before the same date next month (e.g. 25 Aug – 24 Sep). */
function defaultRange(): { from: string; to: string } {
  const from = todayISO();
  const d = fromISODate(from);
  return { from, to: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, d.getDate() - 1)) };
}

/**
 * Sets a spending limit for an expense category, or one of its subcategories, over a date
 * range. Finances then shows how much is left on each expense that counts against it.
 */
export default function BudgetEditorScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  // Summary's "Set budget" pre-fills the category and the period being viewed.
  const params = useLocalSearchParams<{ id: string; category?: string; from?: string; to?: string }>();
  const isNew = params.id === 'new';
  const budgetId = isNew ? null : Number(params.id);

  const initial = defaultRange();
  const [loaded, setLoaded] = useState(isNew);
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState(params.from ?? initial.from);
  const [to, setTo] = useState(params.to ?? initial.to);
  const [custom, setCustom] = useState<CustomSubcategory[]>([]);

  const form = JSON.stringify([category, subcategory, amount, from, to]);
  const [pristine, setPristine] = useState<string | null>(isNew ? form : null);
  const leave = useUnsavedChangesGuard(
    loaded && pristine !== null && form !== pristine,
    'this budget',
  );

  useEffect(() => {
    if (budgetId == null) return;
    getBudget(db, budgetId).then((b) => {
      if (!b) return leaveTo('/finance');
      setCategory(b.category);
      setSubcategory(b.subcategory);
      setAmount(centsToInput(b.amountCents));
      setFrom(b.startOn);
      setTo(b.endOn);
      setPristine(
        JSON.stringify([b.category, b.subcategory, centsToInput(b.amountCents), b.startOn, b.endOn]),
      );
      setLoaded(true);
    });
  }, [db, budgetId]);

  useEffect(() => {
    let alive = true;
    (category ? listCustomSubcategories(db, 'expense', category) : Promise.resolve([])).then(
      (list) => alive && setCustom(list),
    );
    return () => {
      alive = false;
    };
  }, [db, category]);

  const pickCategory = (name: string) => {
    if (name === category) return;
    setCategory(name);
    setSubcategory(null);
  };

  const doSave = async () => {
    if (!category) return showMessage('Pick a category');
    const cents = parseMoneyToCents(amount);
    if (cents == null) return showMessage('Enter a budget', 'For example 4,000.');
    const input = { category, subcategory, amountCents: cents, startOn: from, endOn: to };
    if (budgetId == null) await createBudget(db, input);
    else await updateBudget(db, budgetId, input);
    emitDataChanged('finance');
    leave('/finance');
    return true;
  };

  // Ignore repeat taps while a save is in flight, so one budget can't be stored twice.
  const busy = useRef(false);
  const save = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      // Stays locked once saved: the screen closes a moment later.
      if (!(await doSave())) busy.current = false;
    } catch (e) {
      busy.current = false;
      throw e;
    }
  };

  const confirmDelete = async () => {
    if (budgetId == null) return;
    if (!(await confirmDestructive('Delete this budget?', 'Your expenses stay as they are.'))) {
      return;
    }
    await deleteBudget(db, budgetId);
    emitDataChanged('finance');
    leave('/finance');
  };

  // Built once per budget so the header isn't re-mounted while the screen closes.
  const onDelete = useStableCallback(confirmDelete);
  const headerOptions = useMemo(
    () => ({
      title: isNew ? 'New budget' : 'Edit budget',
      headerLeft: webHeaderLeft('/finance'),
      headerRight:
        budgetId != null
          ? () => (
              <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel="Delete budget">
                <Feather name="trash-2" size={21} color={colors.muted} />
              </Pressable>
            )
          : undefined,
    }),
    [isNew, budgetId, onDelete],
  );

  if (!loaded) return null;

  const builtIn = category ? (findCategory('expense', category)?.subcategories ?? []) : [];
  const accent = colors.expense;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={headerOptions} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        bottomOffset={FOOTER_HEIGHT + 16}
      >
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>BUDGET</Text>
          <TextInput
            style={[styles.amount, { color: colors.text }]}
            placeholder="0"
            placeholderTextColor={colors.grey}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(text) => setAmount(formatAmountInput(text))}
            autoFocus={isNew && params.category != null}
            // Tapping an existing amount selects it, so typing replaces it rather than
            // mixing new digits into the old ones.
            selectTextOnFocus
            accessibilityLabel="Budget amount"
          />
        </View>

        <SectionLabel>DATES</SectionLabel>
        <DateRangeField
          value={{ from, to }}
          onChange={(r) => {
            setFrom(r.from);
            setTo(r.to);
          }}
          label="Budget dates"
        />

        <SectionLabel>CATEGORY</SectionLabel>
        <View style={styles.grid}>
          {CATEGORIES.expense.map((c) => {
            const selected = c.name === category;
            return (
              <Pressable
                key={c.name}
                onPress={() => pickCategory(c.name)}
                style={[styles.catTile, selected && { borderColor: accent, backgroundColor: colors.background }]}
                accessibilityState={{ selected }}
              >
                <Text style={{ fontSize: 22 }}>{c.icon}</Text>
                <Text style={styles.catName} numberOfLines={2}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {category && (
          <>
            <SectionLabel>APPLIES TO</SectionLabel>
            <View style={styles.chips}>
              <Chip
                label={`All of ${category}`}
                color={accent}
                selected={subcategory == null}
                onPress={() => setSubcategory(null)}
              />
              {builtIn.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  color={accent}
                  selected={subcategory === s}
                  onPress={() => setSubcategory(s)}
                />
              ))}
              {custom.map((s) => (
                <Chip
                  key={`c${s.id}`}
                  label={s.name}
                  icon="✨"
                  color={accent}
                  selected={subcategory === s.name}
                  onPress={() => setSubcategory(s.name)}
                />
              ))}
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

      <KeyboardStickyView
        offset={{ opened: Math.max(insets.bottom, 16) - 16 }}
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Pressable onPress={save}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButton}>
            <Text style={styles.saveText}>{isNew ? 'Save' : 'Update'}</Text>
          </LinearGradient>
        </Pressable>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20, gap: 14, paddingBottom: 40 },
  amountBox: { alignItems: 'center', paddingVertical: 8, gap: 2 },
  amountLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: colors.muted },
  amount: {
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
    // Full width: a web text field otherwise sizes itself to the font and can overflow.
    alignSelf: 'stretch',
    fontVariant: ['tabular-nums'],
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catTile: {
    width: '30.5%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catName: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background },
  saveButton: { borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
