import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

// Rinsion has no dark mode (see constants/theme.ts) — one fixed navigation
// theme rather than switching on the device's color scheme.
const RinsionNavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.brand,
    background: Colors.background,
    card: Colors.card,
    text: Colors.text,
    border: Colors.backgroundSelected,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={RinsionNavigationTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

// Same single shared auth.users identity space as the website: a signed-in
// account is an employees row (laundry staff), a riders row (rider company
// staff/field rider), or — if the invite flow was interrupted — neither.
// Nested Stack.Protected guards mirror the web's per-route-group tenant
// checks (middleware.ts + (app)/layout.tsx, (rider)/(dashboard)/layout.tsx).
function RootNavigator() {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && profile?.kind === 'employee'}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && profile?.kind === 'rider'}>
        <Stack.Screen name="(rider)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && !profile}>
        <Stack.Screen name="no-access" />
      </Stack.Protected>
    </Stack>
  );
}

function LoadingScreen() {
  return (
    <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText>Loading…</ThemedText>
    </ThemedView>
  );
}
