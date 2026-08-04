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
      <Stack.Screen name="customers/index" />
      <Stack.Screen name="customers/[id]" />
      <Stack.Screen name="customers/[id]/edit" />
      <Stack.Screen name="customers/new" />
      <Stack.Screen name="payments/index" />
      <Stack.Screen name="employees/index" />
      <Stack.Screen name="items-and-services/index" />
      <Stack.Screen name="items-and-services/service/[id]" />
      <Stack.Screen name="reports/index" />
      <Stack.Screen name="account/faq" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/laundry" />
      <Stack.Screen name="settings/branches" />
      <Stack.Screen name="settings/workflow" />
      <Stack.Screen name="settings/pricing-model" />
      <Stack.Screen name="settings/subscription" />
      <Stack.Screen name="settings/sms-usage" />
      <Stack.Screen name="settings/recycle-bin" />
      <Stack.Screen name="settings/danger-zone" />
    </Stack>
  );
}
