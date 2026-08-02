import { Stack } from 'expo-router';

import { useOfflineQueue } from '@/hooks/useOfflineQueue';

export default function AdminLayout() {
  // Mounted here (not per-screen) so the offline queue keeps replaying on
  // reconnect/foreground no matter which admin screen is active.
  useOfflineQueue();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="orders/[id]" />
      <Stack.Screen name="orders/new" />
      <Stack.Screen name="customers/[id]" />
      <Stack.Screen name="customers/[id]/edit" />
      <Stack.Screen name="customers/new" />
    </Stack>
  );
}
