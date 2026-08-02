import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { formatDate } from '@/utils/formatDate';
import type { CustomerDetail } from '@/types/customers';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ customer: CustomerDetail }>(`/api/mobile/customers/${id}`);
      setCustomer(data.customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function handleDelete() {
    Alert.alert(
      'Delete customer',
      `Delete ${customer?.firstName} ${customer?.lastName}? This can be undone from the website's Settings → Recycle Bin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteError(null);
            setIsDeleting(true);
            try {
              await apiPost(`/api/mobile/customers/${id}/delete`, {});
              router.replace('/customers');
            } catch (err) {
              setDeleteError(err instanceof Error ? err.message : 'Failed to delete customer.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Colors.brand} />
      </ThemedView>
    );
  }

  if (error || !customer) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{error ?? 'Customer not found.'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Customers</ThemedText>
      </Pressable>

      <View>
        <ThemedText type="title" style={{ color: Colors.brand }}>{customer.firstName} {customer.lastName}</ThemedText>
        <ThemedText themeColor="textSecondary">{customer.phone} · Customer since {formatDate(customer.memberSince)}</ThemedText>
      </View>

      {deleteError && <ErrorBanner message={deleteError} />}

      <View style={styles.actionRow}>
        <Button onPress={() => router.push(`/orders/new?customerId=${customer.id}`)} style={{ flex: 1 }}>
          New order
        </Button>
        <Button variant="secondary" onPress={() => router.push(`/customers/${customer.id}/edit`)} style={{ flex: 1 }}>
          Edit
        </Button>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <ThemedText themeColor="textSecondary" type="small">Total orders</ThemedText>
          <ThemedText type="title">{customer.totalOrders}</ThemedText>
        </Card>
        <Card style={styles.statCard}>
          <ThemedText themeColor="textSecondary" type="small">Total spent</ThemedText>
          <ThemedText type="title">GHS {customer.totalSpent.toFixed(2)}</ThemedText>
        </Card>
      </View>

      <Card style={styles.section}>
        <SectionLabel>Contact</SectionLabel>
        <ThemedText themeColor="textSecondary" type="small">Phone</ThemedText>
        <ThemedText>{customer.phone}</ThemedText>
        <ThemedText themeColor="textSecondary" type="small" style={{ marginTop: 8 }}>Location</ThemedText>
        <ThemedText>{customer.location ?? '—'}</ThemedText>
      </Card>

      <Card style={styles.section}>
        <SectionLabel>Order history</SectionLabel>
        {customer.orders.length === 0 ? (
          <ThemedText themeColor="textSecondary" type="small">No orders yet.</ThemedText>
        ) : (
          customer.orders.map(order => (
            <Pressable key={order.id} onPress={() => router.push(`/orders/${order.id}`)} style={styles.orderRow}>
              <View>
                <ThemedText type="smallBold" style={{ color: Colors.brand }}>{order.orderNumber}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">{formatDate(order.createdAt)}</ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <StatusBadge status={order.status} />
                <ThemedText type="small">GHS {order.total.toFixed(2)}</ThemedText>
              </View>
            </Pressable>
          ))
        )}
      </Card>

      <Button variant="destructive" onPress={handleDelete} isPending={isDeleting}>
        Delete customer
      </Button>
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
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    gap: 4,
  },
  section: {
    gap: 4,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundSelected,
  },
});
