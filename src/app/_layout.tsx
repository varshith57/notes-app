import '@/lib/reminders'; // registers the foreground notification handler

import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/migrations';
import { colors } from '@/lib/theme';

export default function RootLayout() {
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
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="note/[id]" options={{ title: '' }} />
        <Stack.Screen name="transaction/[id]" options={{ title: 'Financial note' }} />
        <Stack.Screen name="task/[id]" options={{ title: 'Task' }} />
      </Stack>
    </SQLiteProvider>
  );
}
