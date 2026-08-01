import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="orders/[id]" />
      <Stack.Screen name="orders/new" />
    </Stack>
  );
}
