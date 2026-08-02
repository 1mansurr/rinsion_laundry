import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import type { Laundry } from '@/types/settings';

export default function DangerZoneScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [laundry, setLaundry] = useState<Laundry | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ laundry: Laundry }>('/api/mobile/settings/laundry');
      setLaundry(data.laundry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load laundry profile.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!laundry) return;
    setError(null);
    setIsDeleting(true);
    try {
      await apiPost('/api/mobile/settings/danger-zone', { confirmName: confirmText });
      // No explicit navigation needed — the root navigator's Stack.Protected
      // guards switch to (auth) automatically once the session clears, same
      // as every other sign-out in the app.
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete laundry account.');
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Colors.brand} />
      </ThemedView>
    );
  }

  const canDelete = !!laundry && confirmText === laundry.name;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Settings</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.error.fg }}>Danger zone</ThemedText>

      {error && <ErrorBanner message={error} />}

      <View style={styles.warningCard}>
        <ThemedText style={{ color: Colors.error.fg }}>
          Permanently closes <ThemedText style={{ color: Colors.error.fg, fontWeight: '700' }}>{laundry?.name}</ThemedText>&apos;s
          Rinsion account. Every employee — including you — will be signed out and blocked from logging back in.
          Unlike everything else in Settings, there&apos;s no Recycle Bin entry for this — restoring it would need
          direct database access. Treat this as effectively permanent.
        </ThemedText>
      </View>

      <Card style={styles.section}>
        <ThemedText themeColor="textSecondary" type="small">
          Type &quot;{laundry?.name}&quot; to confirm
        </ThemedText>
        <TextField value={confirmText} onChangeText={setConfirmText} placeholder={laundry?.name} autoCapitalize="none" />
        <Button variant="destructive" onPress={handleDelete} isPending={isDeleting} disabled={!canDelete}>
          Delete laundry account
        </Button>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 48,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  warningCard: {
    backgroundColor: Colors.error.bg,
    borderWidth: 1,
    borderColor: Colors.error.border,
    borderRadius: 12,
    padding: 16,
  },
  section: {
    gap: 8,
  },
});
