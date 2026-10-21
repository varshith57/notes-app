import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/DateTimeField';
import { Chip, SectionLabel, Segmented, webHeaderLeft } from '@/components/ui';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from '@/db/financeRepo';
import {
  addCustomSubcategory,
  deleteCustomSubcategory,
  listCustomSubcategories,
  type CustomSubcategory,
} from '@/db/subcategoriesRepo';
import type { Direction } from '@/db/types';
import { CATEGORIES, findCategory } from '@/lib/categories';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { emitDataChanged } from '@/lib/dataEvents';
import { confirmDestructive, leaveTo, showMessage } from '@/lib/dialogs';
import { centsToInput, parseMoneyToCents, todayISO } from '@/lib/format';
import { colors, gradient, radius } from '@/lib/theme';

export default function TransactionEditorScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; direction?: Direction }>();
  const isNew = params.id === 'new';
  const txId = isNew ? null : Number(params.id);

  const [loaded, setLoaded] = useState(isNew);
  const [direction, setDirection] = useState<Direction>(params.direction ?? 'expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [occurredOn, setOccurredOn] = useState(todayISO());
  const [note, setNote] = useState('');
  const [custom, setCustom] = useState<CustomSubcategory[]>([]);
  const [adding, setAdding] = useState(false);
  const [newSub, setNewSub] = useState('');

  // Unsaved-changes guard: compare the form with what was loaded (or the blank form).
  const form = JSON.stringify([direction, amount, category, subcategory, occurredOn, note]);
  const pristine = useRef<string | null>(isNew ? form : null);
  const allowLeave = useUnsavedChangesGuard(
    loaded && pristine.current !== null && form !== pristine.current,
    'this entry',
  );

  useEffect(() => {
    if (txId == null) return;
    getTransaction(db, txId).then((tx) => {
      if (!tx) return leaveTo('/finance');
      setDirection(tx.direction);
      // Plain digits, not locale-formatted, so the parser round-trips in every locale.
      setAmount(centsToInput(tx.amountCents));
      setCategory(tx.category);
      setSubcategory(tx.subcategory);
      setOccurredOn(tx.occurredOn);
      setNote(tx.note);
      pristine.current = JSON.stringify([
        tx.direction,
        centsToInput(tx.amountCents),
        tx.category,
        tx.subcategory,
        tx.occurredOn,
        tx.note,
      ]);
      setLoaded(true);
    });
  }, [db, txId]);

  const loadCustom = useCallback(async () => {
    setCustom(category ? await listCustomSubcategories(db, direction, category) : []);
  }, [db, direction, category]);

  useEffect(() => {
    loadCustom();
  }, [loadCustom]);

  const switchDirection = (d: Direction) => {
    if (d === direction) return;
    setDirection(d);
    setCategory(null);
    setSubcategory(null);
  };

  const pickCategory = (name: string) => {
    if (name === category) return;
    setCategory(name);
    setSubcategory(null);
    setAdding(false);
  };

  const addSub = async () => {
    const name = newSub.trim();
    if (!name || !category) return;
    await addCustomSubcategory(db, direction, category, name);
    await loadCustom();
    setSubcategory(name);
    setNewSub('');
    setAdding(false);
  };

  const confirmRemoveSub = async (sub: CustomSubcategory) => {
    const ok = await confirmDestructive(
      `Remove "${sub.name}"?`,
      'It disappears from this list. Entries already using it keep their label.',
      'Remove',
    );
    if (!ok) return;
    await deleteCustomSubcategory(db, sub.id);
    if (subcategory === sub.name) setSubcategory(null);
    loadCustom();
  };

  const doSave = async () => {
    const cents = parseMoneyToCents(amount);
    if (cents == null) return showMessage('Enter an amount', 'For example 1250 or 1250.50.');
    if (!category) return showMessage('Pick a category');

    const input = { direction, amountCents: cents, category, subcategory, occurredOn, note: note.trim() };
    if (txId == null) await createTransaction(db, input);
    else await updateTransaction(db, txId, input);
    emitDataChanged('finance');
    allowLeave();
    leaveTo('/finance');
  };

  // Ignore repeat taps while a save is in flight, so one entry can't be stored twice.
  const busy = useRef(false);
  const save = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await doSave();
    } finally {
      busy.current = false;
    }
  };

  const confirmDelete = async () => {
    if (txId == null) return;
    if (!(await confirmDestructive('Delete this entry?', 'This cannot be undone.'))) return;
    await deleteTransaction(db, txId);
    emitDataChanged('finance');
    allowLeave();
    leaveTo('/finance');
  };

  if (!loaded) return null;

  const accent = direction === 'income' ? colors.income : colors.expense;
  const builtIn = category ? (findCategory(direction, category)?.subcategories ?? []) : [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <Stack.Screen
        options={{
          title: isNew ? 'New entry' : 'Edit entry',
          headerLeft: webHeaderLeft('/finance'),
          headerRight: () =>
            txId != null ? (
              <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete entry">
                <Feather name="trash-2" size={21} color={colors.muted} />
              </Pressable>
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Segmented
          value={direction}
          onChange={switchDirection}
          options={[
            { value: 'expense', label: 'Expense', icon: 'trending-down' },
            { value: 'income', label: 'Income', icon: 'trending-up' },
          ]}
        />

        <View style={styles.amountBox}>
          <TextInput
            style={[styles.amount, { color: accent }]}
            placeholder="0"
            placeholderTextColor={colors.grey}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus={isNew}
          />
        </View>

        <SectionLabel>CATEGORY</SectionLabel>
        <View style={styles.grid}>
          {CATEGORIES[direction].map((c) => {
            const selected = c.name === category;
            return (
              <Pressable
                key={c.name}
                onPress={() => pickCategory(c.name)}
                style={[styles.catTile, selected && { borderColor: accent, backgroundColor: colors.background }]}
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
            <SectionLabel>SUBCATEGORY</SectionLabel>
            <View style={styles.chips}>
              {builtIn.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  color={accent}
                  selected={subcategory === s}
                  onPress={() => setSubcategory(subcategory === s ? null : s)}
                />
              ))}
              {custom.map((s) => (
                <Chip
                  key={`c${s.id}`}
                  label={s.name}
                  icon="✨"
                  color={accent}
                  selected={subcategory === s.name}
                  onPress={() => setSubcategory(subcategory === s.name ? null : s.name)}
                  onLongPress={() => confirmRemoveSub(s)}
                />
              ))}
              {!adding && <Chip label="+ Custom" onPress={() => setAdding(true)} />}
            </View>
            {adding && (
              <View style={styles.addRow}>
                <TextInput
                  autoFocus
                  style={[styles.input, { flex: 1 }]}
                  placeholder={`New ${direction} subcategory`}
                  placeholderTextColor={colors.muted}
                  value={newSub}
                  onChangeText={setNewSub}
                  onSubmitEditing={addSub}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={addSub}
                  accessibilityLabel="Add subcategory"
                  style={[styles.addButton, { backgroundColor: accent }]}
                >
                  <Feather name="check" size={20} color={colors.onPrimary} />
                </Pressable>
                <Pressable
                  onPress={() => setAdding(false)}
                  accessibilityLabel="Cancel new subcategory"
                  style={styles.cancelButton}
                >
                  <Feather name="x" size={20} color={colors.muted} />
                </Pressable>
              </View>
            )}
            {custom.length > 0 && (
              <Text style={styles.hint}>Long-press a ✨ custom subcategory to remove it.</Text>
            )}
          </>
        )}

        <SectionLabel>DATE</SectionLabel>
        <View style={{ flexDirection: 'row' }}>
          <DateTimeField mode="date" value={occurredOn} onChange={setOccurredOn} placeholder="Date" />
        </View>

        <SectionLabel>NOTE</SectionLabel>
        <TextInput
          style={[styles.input, { minHeight: 90 }]}
          placeholder="Optional details"
          placeholderTextColor={colors.muted}
          value={note}
          onChangeText={setNote}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable onPress={save}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButton}>
            <Text style={styles.saveText}>{isNew ? 'Save entry' : 'Update entry'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20, gap: 14, paddingBottom: 40 },
  amountBox: { alignItems: 'center', paddingVertical: 12 },
  amount: {
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 160,
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
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, color: colors.muted },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background },
  saveButton: { borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
