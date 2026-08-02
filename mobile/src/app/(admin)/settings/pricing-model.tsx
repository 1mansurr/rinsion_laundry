import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { PRICING_MODELS, type PricingModel } from '@/constants/statuses';
import type { WorkflowSettings } from '@/types/settings';

const MODEL_LABELS: Record<PricingModel, string> = {
  per_item: 'Per item',
  per_kg: 'Per kg',
  mixed: 'Mixed',
};

export default function PricingModelSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<WorkflowSettings | null>(null);
  const [taxRate, setTaxRate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ settings: WorkflowSettings }>('/api/mobile/settings/workflow');
      setSettings(data.settings);
      setTaxRate(data.settings.taxRate.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricing model.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleModelChange(model: PricingModel) {
    if (!settings || model === settings.pricingModel) return;
    Alert.alert(
      'Change pricing model',
      model === 'mixed'
        ? 'Each service can then use its own per-item or per-kg pricing.'
        : `Every service will be switched to ${MODEL_LABELS[model].toLowerCase()} pricing. Set actual prices on Items & Services afterward.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => saveModel(model) },
      ]
    );
  }

  async function saveModel(model: PricingModel) {
    setError(null);
    setIsSaving(true);
    try {
      await apiPost('/api/mobile/settings/workflow', { pricingModel: model });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change pricing model.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveTaxRate() {
    const parsed = parseFloat(taxRate);
    if (isNaN(parsed) || parsed < 0) {
      setError('Enter a valid tax rate.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await apiPost('/api/mobile/settings/workflow', { taxRate: parsed });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tax rate.');
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
      <ThemedText type="title" style={{ color: Colors.brand }}>Pricing model</ThemedText>

      {error && <ErrorBanner message={error} />}

      <Card style={styles.section}>
        <SectionLabel>Model</SectionLabel>
        <ThemedText themeColor="textSecondary" type="small">
          How your services are priced across the app. Changing this can update every service&apos;s pricing mode.
        </ThemedText>
        <View style={styles.chipRow}>
          {PRICING_MODELS.map(m => (
            <Chip key={m} selected={settings?.pricingModel === m} onPress={() => handleModelChange(m)}>
              {MODEL_LABELS[m]}
            </Chip>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Tax rate (%)</SectionLabel>
        <TextField value={taxRate} onChangeText={setTaxRate} placeholder="0" keyboardType="decimal-pad" />
        <Button onPress={handleSaveTaxRate} isPending={isSaving}>Save tax rate</Button>
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
