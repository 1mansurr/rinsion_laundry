import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import type { Laundry } from '@/types/settings';

export default function LaundrySettingsScreen() {
  const router = useRouter();
  const [laundry, setLaundry] = useState<Laundry | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ laundry: Laundry }>('/api/mobile/settings/laundry');
      setLaundry(data.laundry);
      setName(data.laundry.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load laundry profile.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveName() {
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await apiPost('/api/mobile/settings/laundry', { name: name.trim() });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save name.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleRegeneratePin() {
    Alert.alert('Regenerate join PIN', 'The old PIN will stop working immediately. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        onPress: async () => {
          setError(null);
          setIsRegenerating(true);
          try {
            await apiPost<{ joinPin: string }>('/api/mobile/settings/laundry/regenerate-pin', {});
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to regenerate PIN.');
          } finally {
            setIsRegenerating(false);
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Colors.brand} />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Settings</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.brand }}>Laundry profile</ThemedText>

      {error && <ErrorBanner message={error} />}

      <Card style={styles.section}>
        <SectionLabel>Laundry code</SectionLabel>
        <ThemedText>{laundry?.laundryCode}</ThemedText>
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Name</SectionLabel>
        <TextField value={name} onChangeText={setName} placeholder="Laundry name" />
        <Button onPress={handleSaveName} isPending={isSaving}>Save name</Button>
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Join PIN</SectionLabel>
        <ThemedText themeColor="textSecondary" type="small">Staff use this PIN to request to join your team.</ThemedText>
        <ThemedText type="title">{laundry?.joinPin}</ThemedText>
        <Button variant="secondary" onPress={handleRegeneratePin} isPending={isRegenerating}>Regenerate PIN</Button>
      </Card>
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText themeColor="textSecondary" type="small" style={{ letterSpacing: 0.5 }}>
      {children.toUpperCase()}
    </ThemedText>
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
  section: {
    gap: 8,
  },
});
