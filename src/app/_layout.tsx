import '@/lib/webStyles'; // removes the browser focus ring around text fields

import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { SystemNavBar } from '@/components/SystemNavBar';
import { Text } from '@/components/Text';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/migrations';
import '@/lib/reminders'; // registers the foreground notification handler
import { initReminderPrefs } from '@/lib/reminderPrefs';
import { initTextScale, useTextScale } from '@/lib/textScale';
import { useOpenTaskFromReminder } from '@/lib/useOpenTaskFromReminder';
import { colors, radius } from '@/lib/theme';

const editorKey = (_name: string, params: { id?: string | string[] }) => String(params.id);

export default function RootLayout() {
  useOpenTaskFromReminder();
  // Screen titles in the navigation bar follow the app's text size too.
  const scale = useTextScale();

  return (
    // Moves editors' content and footers above the on-screen keyboard (Android draws
    // edge-to-edge, so the window no longer shrinks for the keyboard by itself).
    <KeyboardProvider>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        onInit={migrateDbIfNeeded}
        // Lets Google backup notice every write (see lib/sync.ts).
        options={{ enableChangeListener: true }}
      >
        <LoadPreferences />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: colors.text,
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: colors.background },
            headerTitleStyle: { fontSize: Math.round(17 * scale) },
            contentStyle: { backgroundColor: colors.background },
            // Web stack transitions can leave a closing screen stuck half on top; phones
            // use native navigation and keep their animations.
            animation: Platform.OS === 'web' ? 'none' : 'default',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* One editor per item: a double tap reuses the open editor instead of stacking
              a second copy on top (which showed as two overlapping screens). */}
          <Stack.Screen name="note/[id]" options={{ title: '' }} dangerouslySingular={editorKey} />
          <Stack.Screen
            name="transaction/[id]"
            options={{ title: 'Financial note' }}
            dangerouslySingular={editorKey}
          />
          <Stack.Screen name="task/[id]" options={{ title: 'Task' }} dangerouslySingular={editorKey} />
          <Stack.Screen
            name="budget/[id]"
            options={{ title: 'Budget' }}
            dangerouslySingular={editorKey}
          />
          <Stack.Screen name="budgets" options={{ title: 'Budgets' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen
            name="welcome"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
        </Stack>
        <SystemNavBar />
      </SQLiteProvider>
    </KeyboardProvider>
  );
}

/** Loads saved preferences (text size, reminders) as soon as the database is ready. */
function LoadPreferences() {
  const db = useSQLiteContext();
  useEffect(() => {
    initTextScale(db).catch(() => {});
    initReminderPrefs(db).catch(() => {});
  }, [db]);
  return null;
}

/** Shown instead of a blank screen if a screen crashes; data on the device is untouched. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorBody}>
        Your notes and entries are safe on this device. Try again, or restart the app.
      </Text>
      <Pressable onPress={retry} style={styles.errorButton}>
        <Text style={styles.errorButtonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: colors.background,
  },
  errorTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  errorBody: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  errorButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  errorButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
});
