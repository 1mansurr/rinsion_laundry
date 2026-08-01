import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { ORDER_STATUS_TRANSITIONS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, STATUS_LABELS, type PaymentMethod } from '@/constants/statuses';
import type { OrderDetailData } from '@/types/orders';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ order: OrderDetailData }>(`/api/mobile/orders/${id}`);
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRecordPayment() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setActionError('Enter a valid amount.');
      return;
    }
    setActionError(null);
    setIsSubmitting(true);
    try {
      await apiPost(`/api/mobile/orders/${id}/payments`, { amount: parsed, paymentMethod: method });
      setAmount('');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdvanceStatus(nextStatus: string) {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await apiPost(`/api/mobile/orders/${id}/status`, { status: nextStatus });
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Colors.brand} />
      </ThemedView>
    );
  }

  if (error || !order) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{error ?? 'Order not found.'}</ThemedText>
      </ThemedView>
    );
  }

  const balance = order.total - order.amountPaid;
  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status]?.filter(s => s !== 'cancelled') ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>

      <View style={styles.titleRow}>
        <ThemedText type="title" style={{ color: Colors.brand }}>{order.orderNumber}</ThemedText>
        <StatusBadge status={order.status} />
      </View>
      <ThemedText themeColor="textSecondary">
        {order.customerName} · {order.customerPhone}
      </ThemedText>

      <Card style={styles.section}>
        <SectionLabel>Location</SectionLabel>
        <ThemedText>{order.location ?? '—'}</ThemedText>
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Items</SectionLabel>
        {order.items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <ThemedText type="small">
              {item.itemTypeName} · {item.serviceName}
            </ThemedText>
            <ThemedText type="small">GHS {item.totalPrice.toFixed(2)}</ThemedText>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Payment</SectionLabel>
        <ThemedText>Total: GHS {order.total.toFixed(2)}</ThemedText>
        <ThemedText>Paid: GHS {order.amountPaid.toFixed(2)}</ThemedText>
        <ThemedText style={{ fontWeight: '700', color: balance > 0 ? Colors.error.fg : Colors.success.fg }}>
          Balance: GHS {balance.toFixed(2)}
        </ThemedText>
      </Card>

      {actionError && <ErrorBanner message={actionError} />}

      {balance > 0 && (
        <Card style={styles.section}>
          <SectionLabel>Record payment</SectionLabel>
          <TextField
            value={amount}
            onChangeText={setAmount}
            placeholder={`Amount (up to GHS ${balance.toFixed(2)})`}
            keyboardType="decimal-pad"
          />
          <View style={styles.chipRow}>
            {PAYMENT_METHODS.map(m => (
              <Chip key={m} selected={method === m} onPress={() => setMethod(m)}>
                {PAYMENT_METHOD_LABELS[m]}
              </Chip>
            ))}
          </View>
          <Button onPress={handleRecordPayment} isPending={isSubmitting}>
            Record payment
          </Button>
        </Card>
      )}

      {nextStatuses.length > 0 && (
        <Card style={styles.section}>
          <SectionLabel>Advance status</SectionLabel>
          <View style={styles.chipRow}>
            {nextStatuses.map(s => (
              <Button key={s} variant="secondary" onPress={() => handleAdvanceStatus(s)} isPending={isSubmitting}>
                {`Mark ${STATUS_LABELS[s] ?? s}`}
              </Button>
            ))}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText themeColor="textSecondary" type="small" style={styles.sectionLabel}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
