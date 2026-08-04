import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/utils/formatDate';
import type { CustomerRow } from '@/types/customers';

export default function CustomersListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const data = await apiGet<{ rows: CustomerRow[]; total: number }>(`/api/mobile/customers${params}`);
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers.');
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
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>

      <View style={styles.header}>
        <ThemedText type="title" style={{ color: Colors.brand }}>Customers</ThemedText>
        <Pressable onPress={() => router.push('/customers/new')}>
          <ThemedText style={{ color: Colors.brand, fontWeight: '600' }}>+ New</ThemedText>
        </Pressable>
      </View>

      <TextField
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => load(query)}
        placeholder="Search name or phone"
      />

      {error && <ErrorBanner message={error} />}

      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => load(query)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!isLoading ? <ThemedText themeColor="textSecondary">No customers found.</ThemedText> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/customers/${item.id}`)}>
            <Card style={styles.row}>
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText type="smallBold">{item.firstName} {item.lastName}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">{item.phone}</ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <ThemedText type="small">{item.ordersCount} order{item.ordersCount !== 1 ? 's' : ''}</ThemedText>
                {item.outstandingBalance > 0 ? (
                  <ThemedText type="small" style={{ color: Colors.error.fg, fontWeight: '600' }}>
                    GHS {item.outstandingBalance.toFixed(2)} due
                  </ThemedText>
                ) : (
                  <ThemedText themeColor="textSecondary" type="small">
                    {item.lastOrderDate ? formatDate(item.lastOrderDate) : '—'}
                  </ThemedText>
                )}
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
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
