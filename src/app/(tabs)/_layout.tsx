import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { TabBar } from '@/components/TabBar';
import { getSetting } from '@/db/settingsRepo';
import { getSyncState, initSync } from '@/lib/sync';
import { syncPendingReminders } from '@/lib/taskActions';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const db = useSQLiteContext();

  useEffect(() => {
    // Make sure every task that should notify has its notification scheduled.
    syncPendingReminders(db).catch(() => {});
    // Restore the Google session and start auto-backup; on first launch offer sign-in.
    (async () => {
      await initSync(db).catch(() => {});
      if (getSyncState().available && !(await getSetting(db, 'onboarding_done'))) {
        router.push('/welcome');
      }
    })();
  }, [db]);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
      <Tabs.Screen name="finance" options={{ title: 'Finance' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
    </Tabs>
  );
}
