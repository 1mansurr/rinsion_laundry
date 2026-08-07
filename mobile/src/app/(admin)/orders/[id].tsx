import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost, NetworkError } from '@/lib/api';
import { enqueueAction, generateOfflineActionId } from '@/lib/offlineQueue';
import { ORDER_STATUS_TRANSITIONS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, STATUS_LABELS, type PaymentMethod } from '@/constants/statuses';
import type { OrderDetailData } from '@/types/orders';

const MOMO_PROVIDERS: { value: 'mtn' | 'vod' | 'tgo'; label: string }[] = [
  { value: 'mtn', label: 'MTN' },
  { value: 'vod', label: 'Telecel' },
  { value: 'tgo', label: 'AirtelTigo' },
];

const POLL_TIMEOUT_MS = 2 * 60 * 1000;

type PayLinkStatus = 'pending' | 'paid' | 'failed' | 'expired';

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

  // Paystack "Pay via Mobile Money" — pushes a USSD/PIN prompt instead of a manual entry.
  const [momoPhone, setMomoPhone] = useState('');
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'vod' | 'tgo'>('mtn');
  const [isPaying, setIsPaying] = useState(false);
  const [payLink, setPayLink] = useState<{ referenceCode: string; displayText?: string } | null>(null);
  const [payLinkStatus, setPayLinkStatus] = useState<PayLinkStatus | null>(null);
  const pollStartRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (order?.customerPhone && !momoPhone) setMomoPhone(order.customerPhone);
  }, [order?.customerPhone, momoPhone]);

  // Poll every 3s for up to ~2min while a Paystack charge is awaiting the
  // customer's PIN confirmation — mirrors settings/subscription.tsx.
  useEffect(() => {
    if (!payLink || payLinkStatus !== 'pending') {
      pollStartRef.current = null;
      return;
    }
    if (pollStartRef.current === null) pollStartRef.current = Date.now();
    if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) return;

    const timer = setTimeout(async () => {
      try {
        const res = await apiGet<{ status: PayLinkStatus }>(`/api/mobile/payments/link?reference=${encodeURIComponent(payLink.referenceCode)}`);
        setPayLinkStatus(res.status);
        if (res.status === 'paid') await load();
      } catch {
        // transient network error — keep polling
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [payLink, payLinkStatus, load]);

  async function handlePayMoMo() {
    if (!momoPhone) return;
    setActionError(null);
    setIsPaying(true);
    try {
      const res = await apiPost<{ referenceCode: string; displayText?: string }>('/api/mobile/payments/link', {
        orderId: id,
        channel: 'mobile_money',
        phone: momoPhone,
        provider: momoProvider,
      });
      setPayLink(res);
      setPayLinkStatus('pending');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start payment.');
    } finally {
      setIsPaying(false);
    }
  }

  async function handleRecordPayment() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setActionError('Enter a valid amount.');
      return;
    }
    setActionError(null);
    setIsSubmitting(true);
    const clientRequestId = generateOfflineActionId();
    const path = `/api/mobile/orders/${id}/payments`;
    const body = { amount: parsed, paymentMethod: method, clientRequestId };
    try {
      await apiPost(path, body);
      setAmount('');
      await load();
    } catch (err) {
      if (err instanceof NetworkError) {
        await enqueueAction(clientRequestId, 'record_payment', path, body);
        setOrder(prev => (prev ? { ...prev, amountPaid: prev.amountPaid + parsed } : prev));
        setAmount('');
        Alert.alert('Saved offline', "This payment will sync automatically once you're back online.");
        return;
      }
      setActionError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdvanceStatus(nextStatus: string) {
    setActionError(null);
    setIsSubmitting(true);
    const path = `/api/mobile/orders/${id}/status`;
    const body = { status: nextStatus };
    try {
      await apiPost(path, body);
      await load();
    } catch (err) {
      if (err instanceof NetworkError) {
        // No clientRequestId needed — re-applying the same status is a harmless no-op server-side.
        await enqueueAction(generateOfflineActionId(), 'update_status', path, body);
        setOrder(prev => (prev ? { ...prev, status: nextStatus } : prev));
        Alert.alert('Saved offline', "This status update will sync automatically once you're back online.");
        return;
      }
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
          <SectionLabel>Pay via Mobile Money</SectionLabel>
          {payLink && payLinkStatus === 'pending' ? (
            <>
              <ThemedText type="small">{payLink.displayText ?? 'Check the customer’s phone to enter their PIN'}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={Colors.brand} size="small" />
                <ThemedText themeColor="textSecondary" type="small">Waiting for confirmation…</ThemedText>
              </View>
            </>
          ) : (
            <>
              <View style={styles.chipRow}>
                {MOMO_PROVIDERS.map(p => (
                  <Chip key={p.value} selected={momoProvider === p.value} onPress={() => setMomoProvider(p.value)}>
                    {p.label}
                  </Chip>
                ))}
              </View>
              <TextField
                value={momoPhone}
                onChangeText={setMomoPhone}
                placeholder="0XX XXX XXXX"
                keyboardType="phone-pad"
              />
              <Button onPress={handlePayMoMo} isPending={isPaying} disabled={!momoPhone}>
                {`Pay GHS ${balance.toFixed(2)} via Mobile Money`}
              </Button>
            </>
          )}
        </Card>
      )}

      {balance > 0 && (
        <Card style={styles.section}>
          <SectionLabel>Or record manually</SectionLabel>
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
