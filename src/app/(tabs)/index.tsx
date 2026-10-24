import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteCard } from '@/components/NoteCard';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { TaskRow } from '@/components/TaskRow';
import { Text } from '@/components/Text';
import { GradientProgress, IconButton, SectionLabel } from '@/components/ui';
import { getFinanceSummary } from '@/db/financeRepo';
import { listNotes } from '@/db/notesRepo';
import { getTaskStats, listUpcoming } from '@/db/tasksRepo';
import type { FinanceSummary, Note, Task } from '@/db/types';
import { formatLongDate, formatMoney, todayISO } from '@/lib/format';
import { periodRange } from '@/lib/periods';
import { toggleTaskDone } from '@/lib/taskActions';
import { colors, goldGradient, gradient, radius } from '@/lib/theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const SHORTCUTS: { label: string; icon: keyof typeof Feather.glyphMap; bg: string; fg: string; href: Href }[] = [
  { label: 'Notes', icon: 'file-text', bg: colors.primarySoft, fg: colors.primary, href: '/notes' },
  { label: 'Finance', icon: 'credit-card', bg: colors.goldSoft, fg: colors.goldDark, href: '/finance' },
  { label: 'Agenda', icon: 'calendar', bg: colors.surface, fg: colors.text, href: { pathname: '/tasks', params: { view: 'agenda' } } },
  { label: 'Reminders', icon: 'bell', bg: colors.primarySoft, fg: colors.primary, href: { pathname: '/tasks', params: { view: 'reminder' } } },
];

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState({ done: 0, total: 0 });
  const [money, setMoney] = useState<FinanceSummary>({ incomeCents: 0, expenseCents: 0 });
  const [upcoming, setUpcoming] = useState<Task[]>([]);
  const [recent, setRecent] = useState<Note[]>([]);

  const load = useCallback(async () => {
    const today = todayISO();
    setStats(await getTaskStats(db, today));
    setMoney(await getFinanceSummary(db, periodRange('month', today)));
    setUpcoming(await listUpcoming(db, today, 3));
    setRecent(await listNotes(db, '', 2));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pct = stats.total ? stats.done / stats.total : 0;
  const net = money.incomeCents - money.expenseCents;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.hello}>{greeting()} 👋</Text>
          <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        </View>
        <Text style={styles.title}>My Space</Text>
        <Text style={styles.date}>Today, {formatLongDate(new Date())}</Text>

        <View style={styles.tiles}>
          <CreateTile
            colors={gradient}
            ink={colors.onPrimary}
            label="New Note"
            onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'new' } })}
          />
          <CreateTile
            colors={goldGradient}
            ink={colors.text}
            label="New Task"
            onPress={() => router.push({ pathname: '/task/[id]', params: { id: 'new' } })}
          />
        </View>

        <View style={styles.progressCard}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.cardTitle}>Today’s progress</Text>
            <Text style={styles.cardSub}>
              {stats.total ? `${stats.done} of ${stats.total} tasks done` : 'No tasks for today'}
            </Text>
          </View>
          <View style={{ width: 120, gap: 6 }}>
            <GradientProgress value={pct} />
            <Text style={styles.pct}>{Math.round(pct * 100)}% Done</Text>
          </View>
        </View>

        <SectionLabel style={styles.section}>BROWSE</SectionLabel>
        <View style={styles.shortcuts}>
          {SHORTCUTS.map((s) => (
            <Pressable key={s.label} onPress={() => router.navigate(s.href)} style={styles.shortcut}>
              <View style={[styles.shortcutIcon, { backgroundColor: s.bg }]}>
                <Feather name={s.icon} size={22} color={s.fg} />
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={1} adjustsFontSizeToFit>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.navigate('/finance')} style={styles.moneyCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardSub}>This month</Text>
            <Text style={[styles.net, net < 0 && { color: colors.expense }]}>
              {net < 0 ? '−' : ''}
              {formatMoney(Math.abs(net))}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={[styles.moneyLine, { color: colors.income }]}>+{formatMoney(money.incomeCents)}</Text>
            <Text style={[styles.moneyLine, { color: colors.expense }]}>−{formatMoney(money.expenseCents)}</Text>
          </View>
        </Pressable>

        {upcoming.length > 0 && (
          <>
            <SectionHeader title="Up next" onSeeAll={() => router.navigate('/tasks')} />
            <View style={{ gap: 10 }}>
              {upcoming.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onPress={() => router.push({ pathname: '/task/[id]', params: { id: t.id } })}
                  onToggle={async () => {
                    await toggleTaskDone(db, t);
                    load();
                  }}
                />
              ))}
            </View>
          </>
        )}

        {recent.length > 0 && (
          <>
            <SectionHeader title="Recent notes" onSeeAll={() => router.navigate('/notes')} />
            <View style={{ gap: 12 }}>
              {recent.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  onPress={() => router.push({ pathname: '/note/[id]', params: { id: n.id } })}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** `ink` is the text/icon colour — white on burgundy, black on gold (white on gold fails contrast). */
function CreateTile({
  colors: tileColors,
  ink,
  label,
  onPress,
}: {
  colors: readonly [string, string];
  ink: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.9 }]}>
      <LinearGradient colors={tileColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
        <View style={[styles.tilePlus, { borderColor: ink }]}>
          <Feather name="plus" size={20} color={ink} />
        </View>
        <View>
          <Text style={[styles.tileSmall, { color: ink }]}>Create</Text>
          <Text style={[styles.tileBig, { color: ink }]}>{label}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable onPress={onSeeAll} hitSlop={8}>
        <Text style={styles.seeAll}>See All</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: TAB_BAR_SPACE + 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hello: { fontSize: 15, color: colors.muted },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: 8, letterSpacing: -0.5 },
  date: { fontSize: 15, color: colors.text, marginTop: 4 },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 22 },
  tile: { height: 170, borderRadius: radius.lg, padding: 16, justifyContent: 'space-between' },
  tilePlus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    opacity: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSmall: { fontSize: 15, opacity: 0.85 },
  tileBig: { fontSize: 24, fontWeight: '800' },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 13, color: colors.muted },
  pct: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right' },
  section: { marginTop: 24, marginBottom: 12 },
  shortcuts: { flexDirection: 'row', justifyContent: 'space-between' },
  shortcut: { alignItems: 'center', gap: 8, width: '23%' },
  shortcutIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: { fontSize: 13, color: colors.text, fontWeight: '500' },
  moneyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  net: { fontSize: 24, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  moneyLine: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  seeAll: { fontSize: 15, color: colors.primary, fontWeight: '600' },
});
