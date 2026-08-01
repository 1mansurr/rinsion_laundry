import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { STATUS_LABELS } from '@/constants/statuses';
import type { OrderListRow } from '@/types/orders';

export default function OrdersListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const [rows, setRows] = useState<OrderListRow[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const data = await apiGet<{ rows: OrderListRow[]; total: number }>(`/api/mobile/orders${params}`);
      setRows(data.rows);
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
        <ThemedText type="title">Orders</ThemedText>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Pressable onPress={() => router.push('/orders/new')}>
            <ThemedText themeColor="textSecondary">+ New</ThemedText>
          </Pressable>
          <Pressable onPress={signOut}>
            <ThemedText themeColor="textSecondary">Sign out</ThemedText>
          </Pressable>
        </View>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => load(query)}
        placeholder="Search order # or customer"
        placeholderTextColor={theme.textSecondary}
        style={[styles.search, { color: theme.text, borderColor: theme.backgroundSelected }]}
      />

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => load(query)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!isLoading ? <ThemedText themeColor="textSecondary">No orders found.</ThemedText> : null}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/orders/${item.id}`)}
            style={[styles.row, { borderColor: theme.backgroundSelected }]}
          >
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">{item.orderNumber}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {item.customerName || '—'}
              </ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText type="small">{STATUS_LABELS[item.status] ?? item.status}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                GHS {item.total.toFixed(2)}
              </ThemedText>
            </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    color: '#B91C1C',
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
});
