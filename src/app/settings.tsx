import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoogleButton } from '@/components/GoogleButton';
import { Text } from '@/components/Text';
import { webHeaderLeft } from '@/components/ui';
import { confirmChoice, showMessage } from '@/lib/dialogs';
import { formatTime, formatTimestamp, toHHMM } from '@/lib/format';
import { REMINDER_TONES, useReminderPrefs, type ReminderPrefs } from '@/lib/reminderPrefs';
import { sendTestReminder } from '@/lib/reminders';
import {
  backupNow,
  restoreFromBackup,
  setAutoBackup,
  signIn,
  signOut,
  useSyncState,
} from '@/lib/sync';
import { updateReminderPrefs } from '@/lib/taskActions';
import { stepTextScale, TEXT_SCALES, textScaleIndex, useTextScale } from '@/lib/textScale';
import { colors, radius } from '@/lib/theme';

// React Native Web uses its own (teal) knob colour when on unless told otherwise.
const switchColors = {
  trackColor: { true: colors.primary, false: colors.border },
  thumbColor: colors.background,
  ...(Platform.OS === 'web' ? ({ activeThumbColor: colors.background } as object) : {}),
};

const when = (iso: string) => `${formatTimestamp(iso)}, ${formatTime(toHHMM(new Date(iso)))}`;

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const reminders = useReminderPrefs();
  const [updatingReminders, setUpdatingReminders] = useState(false);
  const sync = useSyncState();
  // Re-render when the size changes (the dots and button states read it).
  useTextScale();
  const step = textScaleIndex();

  const run = async (task: () => Promise<unknown>, failTitle: string) => {
    try {
      await task();
    } catch (e) {
      await showMessage(failTitle, e instanceof Error ? e.message.split('\n')[0] : undefined);
    }
  };

  const changeReminders = (patch: Partial<ReminderPrefs>) =>
    run(async () => {
      setUpdatingReminders(true);
      try {
        await updateReminderPrefs(db, patch);
      } finally {
        setUpdatingReminders(false);
      }
    }, 'Couldn’t update reminders');

  const testReminder = () =>
    run(async () => {
      const error = await sendTestReminder();
      if (error === 'unsupported') {
        await showMessage('Phone only', 'Reminders ring in the phone app, not in the web preview.');
      } else if (error === 'denied') {
        await showMessage(
          'Notifications are off',
          'Allow notifications for My Notes in your phone’s settings to hear reminders.',
        );
      } else {
        await showMessage('Test reminder set', 'It rings in 5 seconds. You can lock your phone.');
      }
    }, 'Couldn’t send a test reminder');

  const restore = () =>
    run(async () => {
      const ok = await confirmChoice(
        'Restore from backup?',
        'This replaces everything on this phone with your latest Google Drive backup.',
        'Restore',
        'Cancel',
      );
      if (!ok) return;
      const found = await restoreFromBackup();
      await showMessage(found ? 'Restored' : 'No backup yet', found ? 'Your data is back.' : undefined);
    }, 'Couldn’t restore');

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      <Stack.Screen options={{ title: 'Settings', headerLeft: webHeaderLeft('/') }} />

      <Text style={styles.section}>TEXT SIZE</Text>
      <View style={styles.card}>
        <View style={styles.sizeRow}>
          <Pressable
            onPress={() => stepTextScale(-1)}
            disabled={step === 0}
            style={[styles.sizeButton, step === 0 && { opacity: 0.35 }]}
            accessibilityRole="button"
            accessibilityLabel="Smaller text"
          >
            <Text style={[styles.sizeGlyph, { fontSize: 15 }]}>A−</Text>
          </Pressable>
          <View style={styles.sizePreview}>
            <Text style={styles.previewText} numberOfLines={2}>
              Your notes will look like this.
            </Text>
            <View style={styles.dots} accessibilityLabel={`Text size ${step + 1} of ${TEXT_SCALES.length}`}>
              {TEXT_SCALES.map((_, i) => (
                <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
              ))}
            </View>
          </View>
          <Pressable
            onPress={() => stepTextScale(1)}
            disabled={step === TEXT_SCALES.length - 1}
            style={[styles.sizeButton, step === TEXT_SCALES.length - 1 && { opacity: 0.35 }]}
            accessibilityRole="button"
            accessibilityLabel="Larger text"
          >
            <Text style={[styles.sizeGlyph, { fontSize: 22 }]}>A+</Text>
          </Pressable>
        </View>
        <Text style={styles.sub}>Changes the size of text across the whole app.</Text>
      </View>

      <Text style={[styles.section, { marginTop: 12 }]}>REMINDERS</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Feather name="bell" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Task reminders</Text>
            <Text style={styles.sub}>Notify me when a task with a date and time is due.</Text>
          </View>
          {updatingReminders ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={reminders.enabled}
              onValueChange={(enabled) => changeReminders({ enabled })}
              accessibilityLabel="Task reminders"
              {...switchColors}
            />
          )}
        </View>

        {reminders.enabled && (
          <>
            <View style={styles.statusRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Ring like an alarm</Text>
                <Text style={styles.sub}>
                  {reminders.loud
                    ? 'Alarm volume, rings even when the phone is on silent.'
                    : 'Normal notification volume; follows silent mode.'}
                </Text>
              </View>
              <Switch
                value={reminders.loud}
                onValueChange={(loud) => changeReminders({ loud })}
                disabled={updatingReminders}
                accessibilityLabel="Ring like an alarm"
                {...switchColors}
              />
            </View>

            <View style={{ gap: 2 }}>
              <Text style={styles.label}>Tone</Text>
              {REMINDER_TONES.map((tone) => {
                const selected = tone.key === reminders.tone;
                return (
                  <Pressable
                    key={tone.key}
                    onPress={() => !selected && changeReminders({ tone: tone.key })}
                    disabled={updatingReminders}
                    style={styles.toneRow}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <View style={[styles.radio, selected && styles.radioOn]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.toneLabel, selected && { fontWeight: '700' }]}>
                      {tone.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actions}>
              <Pressable onPress={testReminder} disabled={updatingReminders} style={styles.secondary}>
                <Text style={styles.secondaryText}>Play a test reminder</Text>
              </Pressable>
            </View>
          </>
        )}

        {Platform.OS !== 'web' && (
          <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
            <Text style={styles.link}>Phone notification settings</Text>
          </Pressable>
        )}
      </View>

      <Text style={[styles.section, { marginTop: 12 }]}>BACKUP & SYNC</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Feather name="cloud" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Google Drive backup</Text>
            <Text style={styles.sub}>
              Notes, finances and tasks are saved to a private folder in your Google Drive that only
              this app can read. Reinstall and sign in to get everything back.
            </Text>
          </View>
        </View>

        {!sync.available ? (
          <Text style={styles.notice}>
            Google backup isn’t set up in this build of the app yet.
          </Text>
        ) : sync.user ? (
          <>
            <View style={styles.account}>
              <Feather name="user" size={16} color={colors.muted} />
              <Text style={styles.email} numberOfLines={1}>
                {sync.user.email}
              </Text>
              <Pressable onPress={() => run(signOut, 'Couldn’t sign out')} hitSlop={8}>
                <Text style={styles.link}>Sign out</Text>
              </Pressable>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.label}>Last backup</Text>
              {sync.busy === 'backup' ? (
                <View style={styles.inline}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.value}>Backing up…</Text>
                </View>
              ) : (
                <Text style={styles.value}>{sync.lastBackupAt ? when(sync.lastBackupAt) : 'Never'}</Text>
              )}
            </View>
            {sync.lastError && sync.busy !== 'backup' && (
              <Text style={styles.error}>Last attempt failed: {sync.lastError}</Text>
            )}

            <View style={styles.statusRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Back up automatically</Text>
                <Text style={styles.sub}>A few seconds after every change.</Text>
              </View>
              <Switch
                value={sync.autoBackup}
                onValueChange={(on) => run(() => setAutoBackup(on), 'Couldn’t change setting')}
                accessibilityLabel="Back up automatically"
                {...switchColors}
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => run(backupNow, 'Backup failed')}
                disabled={sync.busy != null}
                style={[styles.primary, sync.busy != null && { opacity: 0.6 }]}
              >
                <Text style={styles.primaryText}>Back up now</Text>
              </Pressable>
              <Pressable
                onPress={restore}
                disabled={sync.busy != null}
                style={[styles.secondary, sync.busy != null && { opacity: 0.6 }]}
              >
                {sync.busy === 'restore' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.secondaryText}>Restore</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <GoogleButton busy={sync.busy === 'signin'} onPress={() => run(signIn, 'Couldn’t sign in')} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sizeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeGlyph: { fontWeight: '800', color: colors.primary },
  sizePreview: { flex: 1, alignItems: 'center', gap: 8 },
  previewText: { fontSize: 17, color: colors.text, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 18 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  notice: { fontSize: 14, color: colors.muted },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  email: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  value: { fontSize: 14, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
  actions: { flexDirection: 'row', gap: 10 },
  primary: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  primaryText: { fontSize: 15, fontWeight: '700', color: colors.onPrimary },
  secondary: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  toneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  toneLabel: { fontSize: 15, color: colors.text },
});
