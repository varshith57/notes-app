import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoogleButton } from '@/components/GoogleButton';
import { Text } from '@/components/Text';
import { setSetting } from '@/db/settingsRepo';
import { showMessage } from '@/lib/dialogs';
import { signIn, useSyncState } from '@/lib/sync';
import { colors, radius } from '@/lib/theme';

/** First-launch prompt to turn on Google backup. Optional: Skip is always available. */
export default function WelcomeScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const sync = useSyncState();

  const finish = async () => {
    await setSetting(db, 'onboarding_done', '1');
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const signInAndFinish = async () => {
    try {
      if ((await signIn()) === 'signed-in') await finish();
    } catch (e) {
      await showMessage('Couldn’t sign in', e instanceof Error ? e.message.split('\n')[0] : undefined);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.badge}>
        <Feather name="cloud" size={34} color={colors.primary} />
      </View>
      <Text style={styles.title}>Keep your notes safe</Text>
      <Text style={styles.body}>
        Sign in with Google to back up your notes, finances and tasks automatically. If you change
        phones or reinstall the app, sign in again and everything comes back.
      </Text>
      <View style={styles.points}>
        {[
          'Backed up a few seconds after every change',
          'Stored privately in your Google Drive; only this app can read it',
          'You can sign out or turn it off anytime in Settings',
        ].map((p) => (
          <View key={p} style={styles.point}>
            <Feather name="check" size={16} color={colors.primary} />
            <Text style={styles.pointText}>{p}</Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <GoogleButton busy={sync.busy != null} onPress={signInAndFinish} />
      <Pressable onPress={finish} style={styles.skip} accessibilityRole="button">
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, gap: 14 },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  body: { fontSize: 16, lineHeight: 23, color: colors.muted },
  points: { gap: 10, marginTop: 6, padding: 16, borderRadius: radius.md, backgroundColor: colors.surface },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  pointText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  skip: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 15, fontWeight: '600', color: colors.muted },
});
