import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { formatDate } from '@/utils/formatDate';
import type { RecycleBinData } from '@/types/settings';

type Category = 'customers' | 'orders' | 'itemTypes' | 'services' | 'employees';

const TAB_LABELS: Record<Category, string> = {
  customers: 'Customers',
  orders: 'Orders',
  itemTypes: 'Item types',
  services: 'Services',
  employees: 'Employees',
};

export default function RecycleBinScreen() {
  const router = useRouter();
  const [data, setData] = useState<RecycleBinData | null>(null);
  const [tab, setTab] = useState<Category>('customers');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<RecycleBinData>('/api/mobile/settings/recycle-bin');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recycle bin.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRestore(id: string) {
    setError(null);
    setBusyId(id);
    try {
      await apiPost('/api/mobile/settings/recycle-bin', { category: tab, id });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore.');
    } finally {
      setBusyId(null);
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
      <ThemedText type="title" style={{ color: Colors.brand }}>Recycle bin</ThemedText>

      {error && <ErrorBanner message={error} />}

      <View style={styles.chipRow}>
        {(Object.keys(TAB_LABELS) as Category[]).map(c => (
          <Chip key={c} selected={tab === c} onPress={() => setTab(c)}>
            {`${TAB_LABELS[c]} (${data?.[c].length ?? 0})`}
          </Chip>
        ))}
      </View>

      {tab === 'customers' && data?.customers.map(c => (
        <Card key={c.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="smallBold">{c.firstName} {c.lastName}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">{c.phone} · Deleted {formatDate(c.deletedAt)}</ThemedText>
          </View>
          <Button variant="secondary" onPress={() => handleRestore(c.id)} isPending={busyId === c.id}>Restore</Button>
        </Card>
      ))}

      {tab === 'orders' && data?.orders.map(o => (
        <Card key={o.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="smallBold">{o.orderNumber}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">{o.customerName} · GHS {o.total.toFixed(2)} · Deleted {formatDate(o.deletedAt)}</ThemedText>
          </View>
          <Button variant="secondary" onPress={() => handleRestore(o.id)} isPending={busyId === o.id}>Restore</Button>
        </Card>
      ))}

      {tab === 'itemTypes' && data?.itemTypes.map(i => (
        <Card key={i.id} style={styles.row}>
          <ThemedText type="smallBold" style={{ flex: 1 }}>{i.name}</ThemedText>
          <Button variant="secondary" onPress={() => handleRestore(i.id)} isPending={busyId === i.id}>Restore</Button>
        </Card>
      ))}

      {tab === 'services' && data?.services.map(s => (
        <Card key={s.id} style={styles.row}>
          <ThemedText type="smallBold" style={{ flex: 1 }}>{s.name}</ThemedText>
          <Button variant="secondary" onPress={() => handleRestore(s.id)} isPending={busyId === s.id}>Restore</Button>
        </Card>
      ))}

      {tab === 'employees' && data?.employees.map(e => (
        <Card key={e.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="smallBold">{e.firstName} {e.lastName}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">Deleted {formatDate(e.deletedAt)}</ThemedText>
          </View>
          <Button variant="secondary" onPress={() => handleRestore(e.id)} isPending={busyId === e.id}>Restore</Button>
        </Card>
      ))}

      {!isLoading && data && data[tab].length === 0 && (
        <ThemedText themeColor="textSecondary" type="small">Nothing deleted here.</ThemedText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 48,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
