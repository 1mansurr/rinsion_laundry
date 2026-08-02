import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

export default function ItemsAndServicesScreen() {
  const router = useRouter();
  const [data, setData] = useState<RefData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newItemName, setNewItemName] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<RefData>('/api/mobile/reference-data');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items and services.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddItemType() {
    if (!newItemName.trim()) return;
    setError(null);
    setIsAddingItem(true);
    try {
      await apiPost('/api/mobile/item-types', { name: newItemName.trim() });
      setNewItemName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item type.');
    } finally {
      setIsAddingItem(false);
    }
  }

  async function handleToggleItemType(item: ItemType) {
    setError(null);
    setBusyId(item.id);
    try {
      await apiPost(`/api/mobile/item-types/${item.id}`, { action: 'toggle', isActive: !item.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item type.');
    } finally {
      setBusyId(null);
    }
  }

  function handleDeleteItemType(item: ItemType) {
    Alert.alert('Delete item type', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setError(null);
          setBusyId(item.id);
          try {
            await apiPost(`/api/mobile/item-types/${item.id}`, { action: 'delete' });
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete item type.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  async function handleAddService() {
    if (!newServiceName.trim()) return;
    setError(null);
    setIsAddingService(true);
    try {
      await apiPost('/api/mobile/services', { name: newServiceName.trim() });
      setNewServiceName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add service.');
    } finally {
      setIsAddingService(false);
    }
  }

  async function handleToggleService(service: LaundryService) {
    setError(null);
    setBusyId(service.id);
    try {
      await apiPost(`/api/mobile/services/${service.id}`, { action: 'toggle', isActive: !service.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service.');
    } finally {
      setBusyId(null);
    }
  }

  function handleDeleteService(service: LaundryService) {
    Alert.alert('Delete service', `Delete "${service.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setError(null);
          setBusyId(service.id);
          try {
            await apiPost(`/api/mobile/services/${service.id}`, { action: 'delete' });
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete service.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>

      <ThemedText type="title" style={{ color: Colors.brand }}>Items & Services</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">The garment types and services your team picks from when creating orders.</ThemedText>

      {error && <ErrorBanner message={error} />}

      <View style={styles.section}>
        <SectionLabel>Item types</SectionLabel>
        {!isLoading && data?.itemTypes.length === 0 && <ThemedText themeColor="textSecondary" type="small">No item types yet.</ThemedText>}
        {data?.itemTypes.map(item => (
          <Card key={item.id} style={styles.row}>
            <ThemedText type="smallBold" style={{ flex: 1 }}>{item.name}{!item.isActive ? ' (inactive)' : ''}</ThemedText>
            <View style={styles.rowActions}>
              <Switch value={item.isActive} onValueChange={() => handleToggleItemType(item)} disabled={busyId === item.id} />
              <Pressable onPress={() => handleDeleteItemType(item)} disabled={busyId === item.id}>
                <ThemedText style={{ color: Colors.error.fg }}>Delete</ThemedText>
              </Pressable>
            </View>
          </Card>
        ))}
        <Card style={styles.row}>
          <TextField value={newItemName} onChangeText={setNewItemName} placeholder="New item type" style={{ flex: 1 }} />
          <Button onPress={handleAddItemType} isPending={isAddingItem}>Add</Button>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel>Services</SectionLabel>
        {!isLoading && data?.services.length === 0 && <ThemedText themeColor="textSecondary" type="small">No services yet.</ThemedText>}
        {data?.services.map(service => (
          <Pressable key={service.id} onPress={() => router.push(`/items-and-services/service/${service.id}`)}>
            <Card style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="smallBold">{service.name}{!service.isActive ? ' (inactive)' : ''}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {service.pricingMode === 'per_kg' ? 'Priced per kg' : 'Priced per item'}
                </ThemedText>
              </View>
              <View style={styles.rowActions}>
                <Switch value={service.isActive} onValueChange={() => handleToggleService(service)} disabled={busyId === service.id} />
                <Pressable onPress={() => handleDeleteService(service)} disabled={busyId === service.id}>
                  <ThemedText style={{ color: Colors.error.fg }}>Delete</ThemedText>
                </Pressable>
              </View>
            </Card>
          </Pressable>
        ))}
        <Card style={styles.row}>
          <TextField value={newServiceName} onChangeText={setNewServiceName} placeholder="New service" style={{ flex: 1 }} />
          <Button onPress={handleAddService} isPending={isAddingService}>Add</Button>
        </Card>
      </View>
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
  section: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
