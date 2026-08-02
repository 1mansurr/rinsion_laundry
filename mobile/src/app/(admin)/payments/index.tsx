import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Colors } from '@/constants/theme';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/utils/formatDate';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/statuses';
import type { PaymentRow, PaymentsSummary } from '@/types/payments';

export default function PaymentsListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [method, setMethod] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (m: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = m !== 'all' ? `?method=${m}` : '';
      const data = await apiGet<{ rows: PaymentRow[]; total: number; summary: PaymentsSummary }>(`/api/mobile/payments${params}`);
      setRows(data.rows);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(method);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: Colors.brand }}>Payments</ThemedText>
        <Pressable onPress={() => router.push('/')}>
          <ThemedText style={{ color: Colors.brand, fontWeight: '600' }}>Orders</ThemedText>
        </Pressable>
      </View>

      {summary && (
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <ThemedText themeColor="textSecondary" type="small">Today</ThemedText>
            <ThemedText type="smallBold">GHS {summary.collectedToday.toFixed(2)}</ThemedText>
          </Card>
          <Card style={styles.statCard}>
            <ThemedText themeColor="textSecondary" type="small">This week</ThemedText>
            <ThemedText type="smallBold">GHS {summary.collectedThisWeek.toFixed(2)}</ThemedText>
          </Card>
          <Card style={styles.statCard}>
            <ThemedText themeColor="textSecondary" type="small">Outstanding</ThemedText>
            <ThemedText type="smallBold" style={summary.outstandingBalance > 0 ? { color: Colors.error.fg } : undefined}>
              GHS {summary.outstandingBalance.toFixed(2)}
            </ThemedText>
          </Card>
        </View>
      )}

      <View style={styles.chipRow}>
        <Chip selected={method === 'all'} onPress={() => { setMethod('all'); load('all'); }}>All</Chip>
        {PAYMENT_METHODS.map(m => (
          <Chip key={m} selected={method === m} onPress={() => { setMethod(m); load(m); }}>
            {PAYMENT_METHOD_LABELS[m]}
          </Chip>
        ))}
      </View>

      {error && <ErrorBanner message={error} />}

      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => load(method)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!isLoading ? <ThemedText themeColor="textSecondary">No payments found.</ThemedText> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/orders/${item.orderId}`)}>
            <Card style={styles.row}>
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText type="smallBold">{item.customerName || '—'}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {formatDate(item.date)} · {item.orderNumber} · {PAYMENT_METHOD_LABELS[item.method as keyof typeof PAYMENT_METHOD_LABELS] ?? item.method}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ color: Colors.success.fg }}>
                GHS {item.amount.toFixed(2)}
              </ThemedText>
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
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    gap: 4,
    padding: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
