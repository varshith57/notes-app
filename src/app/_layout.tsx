import '@/lib/reminders'; // registers the foreground notification handler
import '@/lib/webStyles'; // removes the browser focus ring around text fields

import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/migrations';
import { useOpenTaskFromReminder } from '@/lib/reminders';
import { colors, radius } from '@/lib/theme';

const editorKey = (_name: string, params: { id?: string | string[] }) => String(params.id);

export default function RootLayout() {
  useOpenTaskFromReminder();

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: colors.background },
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
      </Stack>
    </SQLiteProvider>
  );
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
