import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { apiGet } from '@/lib/api';
import type { OrderListRow } from '@/types/orders';

export default function OrdersListScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [rows, setRows] = useState<OrderListRow[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<{ employeeId: string; laundryId: string; rawOrderCount: number | null } | null>(null);

  const load = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const data = await apiGet<{ rows: OrderListRow[]; total: number; debug?: typeof debug }>(`/api/mobile/orders${params}`);
      setRows(data.rows);
      setDebug(data.debug ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: Colors.brand }}>Orders</ThemedText>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/orders/new')}>
            <ThemedText style={{ color: Colors.brand, fontWeight: '600' }}>+ New</ThemedText>
          </Pressable>
          <Pressable onPress={signOut}>
            <ThemedText themeColor="textSecondary">Sign out</ThemedText>
          </Pressable>
        </View>
      </View>

      <TextField
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => load(query)}
        placeholder="Search order # or customer"
      />

      {error && <ErrorBanner message={error} />}

      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => load(query)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!isLoading ? (
          <View style={{ gap: 4 }}>
            <ThemedText themeColor="textSecondary">No orders found.</ThemedText>
            {debug && (
              <ThemedText themeColor="textSecondary" type="small">
                (debug: employee {debug.employeeId.slice(0, 8)}, laundry {debug.laundryId.slice(0, 8)}, {debug.rawOrderCount ?? '?'} total orders on this laundry)
              </ThemedText>
            )}
          </View>
        ) : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/orders/${item.id}`)}>
            <Card style={styles.row}>
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText type="smallBold">{item.orderNumber}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {item.customerName || '—'}
                </ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <StatusBadge status={item.status} />
                <ThemedText type="small" style={styles.amount}>GHS {item.total.toFixed(2)}</ThemedText>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
});
