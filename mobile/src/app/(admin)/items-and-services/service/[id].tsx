import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import type { ItemType, LaundryService, PriceCell } from '@/types/referenceData';

interface RefData {
  itemTypes: ItemType[];
  services: LaundryService[];
  pricingMatrix: PriceCell[];
  pricingModel: 'per_item' | 'per_kg' | 'mixed';
}

export default function ServicePricingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<RefData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [notes, setNotes] = useState('');
  const [rowInputs, setRowInputs] = useState<Record<string, { min: string; max: string }>>({});
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<RefData>('/api/mobile/reference-data');
      setData(result);
      const service = result.services.find(s => s.id === id);
      if (service) {
        setMinRate(service.minKgRate?.toString() ?? '');
        setMaxRate(service.maxKgRate?.toString() ?? '');
        setNotes(service.notes ?? '');
      }
      const inputs: Record<string, { min: string; max: string }> = {};
      for (const cell of result.pricingMatrix.filter(c => c.serviceId === id)) {
        inputs[cell.itemTypeId] = { min: cell.minPrice.toString(), max: cell.maxPrice.toString() };
      }
      setRowInputs(inputs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const service = data?.services.find(s => s.id === id);

  async function handleModeChange(mode: 'per_item' | 'per_kg') {
    if (!service || mode === service.pricingMode) return;
    setError(null);
    setIsSaving(true);
    try {
      await apiPost(`/api/mobile/services/${id}`, { action: 'pricing', pricingMode: mode, minKgRate: null, maxKgRate: null, notes: null });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change pricing mode.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveKgRate() {
    setError(null);
    setIsSaving(true);
    try {
      await apiPost(`/api/mobile/services/${id}`, {
        action: 'pricing',
        pricingMode: 'per_kg',
        minKgRate: parseFloat(minRate),
        maxKgRate: parseFloat(maxRate),
        notes: notes.trim() || null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rate.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveCell(itemTypeId: string) {
    const input = rowInputs[itemTypeId];
    const min = parseFloat(input?.min ?? '');
    const max = parseFloat(input?.max ?? '');
    if (isNaN(min) || isNaN(max)) {
      setError('Enter both a min and max price.');
      return;
    }
    setError(null);
    setBusyRowId(itemTypeId);
    try {
      await apiPost('/api/mobile/prices', { itemTypeId, serviceId: id, minPrice: min, maxPrice: max });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save price.');
    } finally {
      setBusyRowId(null);
    }
  }

  async function handleToggleCell(cellId: string, isActive: boolean) {
    setError(null);
    setBusyRowId(cellId);
    try {
      await apiPost(`/api/mobile/prices/${cellId}`, { isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price.');
    } finally {
      setBusyRowId(null);
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Colors.brand} />
      </ThemedView>
    );
  }

  if (!service) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{error ?? 'Service not found.'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Items & Services</ThemedText>
      </Pressable>

      <ThemedText type="title" style={{ color: Colors.brand }}>{service.name}</ThemedText>

      {error && <ErrorBanner message={error} />}

      {data?.pricingModel === 'mixed' && (
        <View style={styles.chipRow}>
          <Chip selected={service.pricingMode === 'per_item'} onPress={() => handleModeChange('per_item')}>Per item</Chip>
          <Chip selected={service.pricingMode === 'per_kg'} onPress={() => handleModeChange('per_kg')}>Per kg</Chip>
        </View>
      )}

      {service.pricingMode === 'per_kg' ? (
        <Card style={styles.section}>
          <SectionLabel>Rate per kg (GHS)</SectionLabel>
          <View style={styles.rowInputs}>
            <TextField value={minRate} onChangeText={setMinRate} placeholder="Min" keyboardType="decimal-pad" style={{ flex: 1 }} />
            <TextField value={maxRate} onChangeText={setMaxRate} placeholder="Max" keyboardType="decimal-pad" style={{ flex: 1 }} />
          </View>
          <TextField value={notes} onChangeText={setNotes} placeholder="Notes (optional)" />
          <Button onPress={handleSaveKgRate} isPending={isSaving}>Save rate</Button>
        </Card>
      ) : (
        <View style={styles.section}>
          <SectionLabel>Prices by item type (GHS)</SectionLabel>
          {data?.itemTypes.map(item => {
            const cell = data.pricingMatrix.find(c => c.serviceId === id && c.itemTypeId === item.id);
            const input = rowInputs[item.id] ?? { min: '', max: '' };
            return (
              <Card key={item.id} style={{ gap: 8 }}>
                <View style={styles.row}>
                  <ThemedText type="smallBold" style={{ flex: 1 }}>{item.name}</ThemedText>
                  {cell && (
                    <Switch value={cell.isActive} onValueChange={v => handleToggleCell(cell.id, v)} disabled={busyRowId === cell.id} />
                  )}
                </View>
                <View style={styles.rowInputs}>
                  <TextField
                    value={input.min}
                    onChangeText={v => setRowInputs(prev => ({ ...prev, [item.id]: { min: v, max: prev[item.id]?.max ?? '' } }))}
                    placeholder="Min"
                    keyboardType="decimal-pad"
                    style={{ flex: 1 }}
                  />
                  <TextField
                    value={input.max}
                    onChangeText={v => setRowInputs(prev => ({ ...prev, [item.id]: { min: prev[item.id]?.min ?? '', max: v } }))}
                    placeholder="Max"
                    keyboardType="decimal-pad"
                    style={{ flex: 1 }}
                  />
                  <Button variant="secondary" onPress={() => handleSaveCell(item.id)} isPending={busyRowId === item.id}>
                    Save
                  </Button>
                </View>
              </Card>
            );
          })}
        </View>
      )}
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
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});
