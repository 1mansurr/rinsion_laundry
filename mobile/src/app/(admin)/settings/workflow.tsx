import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import type { WorkflowSettings } from '@/types/settings';

export default function WorkflowSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<WorkflowSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ settings: WorkflowSettings }>('/api/mobile/settings/workflow');
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(key: 'allowExpressOrders' | 'requirePickupCode', value: boolean) {
    if (!settings) return;
    setError(null);
    setSettings({ ...settings, [key]: value });
    setIsSaving(true);
    try {
      await apiPost('/api/mobile/settings/workflow', { [key]: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting.');
      await load();
    } finally {
      setIsSaving(false);
    }
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
      <ThemedText type="title" style={{ color: Colors.brand }}>Workflow</ThemedText>

      {error && <ErrorBanner message={error} />}

      <Card style={{ gap: 0 }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: '600' }}>Allow express orders</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">Let staff mark an order as express priority.</ThemedText>
          </View>
          <Switch
            value={settings?.allowExpressOrders ?? false}
            onValueChange={v => handleToggle('allowExpressOrders', v)}
            disabled={isSaving}
          />
        </View>
        <View style={[styles.row, styles.rowBorder]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: '600' }}>Require pickup code</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">Customers must give a code before collecting an order.</ThemedText>
          </View>
          <Switch
            value={settings?.requirePickupCode ?? false}
            onValueChange={v => handleToggle('requirePickupCode', v)}
            disabled={isSaving}
          />
        </View>
        <View style={[styles.row, styles.rowBorder]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: '600' }}>Customer submissions</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">Coming soon.</ThemedText>
          </View>
          <Switch value={settings?.allowCustomerSubmissions ?? false} disabled />
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundSelected,
  },
});
