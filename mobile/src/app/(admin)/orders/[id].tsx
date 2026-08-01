import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { apiGet, apiPost } from '@/lib/api';
import { ORDER_STATUS_TRANSITIONS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, STATUS_LABELS, type PaymentMethod } from '@/constants/statuses';
import type { OrderDetailData } from '@/types/orders';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
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
        <ActivityIndicator />
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
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>

      <ThemedText type="title">{order.orderNumber}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {order.customerName} · {order.customerPhone}
      </ThemedText>

      <Section label="Status">
        <ThemedText>{STATUS_LABELS[order.status] ?? order.status}</ThemedText>
      </Section>

      <Section label="Location">
        <ThemedText>{order.location ?? '—'}</ThemedText>
      </Section>

      <Section label="Items">
        {order.items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <ThemedText type="small">
              {item.itemTypeName} · {item.serviceName}
            </ThemedText>
            <ThemedText type="small">GHS {item.totalPrice.toFixed(2)}</ThemedText>
          </View>
        ))}
      </Section>

      <Section label="Payment">
        <ThemedText>Total: GHS {order.total.toFixed(2)}</ThemedText>
        <ThemedText>Paid: GHS {order.amountPaid.toFixed(2)}</ThemedText>
        <ThemedText style={{ fontWeight: '700', color: balance > 0 ? '#B91C1C' : '#15803D' }}>
          Balance: GHS {balance.toFixed(2)}
        </ThemedText>
      </Section>

      {actionError && <ThemedText style={styles.error}>{actionError}</ThemedText>}

      {balance > 0 && (
        <Section label="Record payment">
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder={`Amount (up to GHS ${balance.toFixed(2)})`}
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <View style={styles.chipRow}>
            {PAYMENT_METHODS.map(m => (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                style={[
                  styles.chip,
                  { borderColor: theme.backgroundSelected },
                  method === m && { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText type="small">{PAYMENT_METHOD_LABELS[m]}</ThemedText>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={handleRecordPayment} disabled={isSubmitting} style={[styles.button, { opacity: isSubmitting ? 0.6 : 1 }]}>
            <ThemedText style={styles.buttonText}>{isSubmitting ? 'Saving…' : 'Record payment'}</ThemedText>
          </Pressable>
        </Section>
      )}

      {nextStatuses.length > 0 && (
        <Section label="Advance status">
          <View style={styles.chipRow}>
            {nextStatuses.map(s => (
              <Pressable
                key={s}
                onPress={() => handleAdvanceStatus(s)}
                disabled={isSubmitting}
                style={[styles.button, { opacity: isSubmitting ? 0.6 : 1 }]}
              >
                <ThemedText style={styles.buttonText}>Mark {STATUS_LABELS[s] ?? s}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Section>
      )}
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText themeColor="textSecondary" type="small" style={styles.sectionLabel}>
        {label.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    gap: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 16,
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  error: {
    color: '#B91C1C',
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button: {
    backgroundColor: '#2F6B4F',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FAF8F5',
    fontWeight: '600',
  },
});
