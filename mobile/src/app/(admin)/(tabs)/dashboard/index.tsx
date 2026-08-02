import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { EMPLOYEE_ROLE } from '@/constants/statuses';
import type { DashboardData, ReadyOrder } from '@/types/dashboard';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [collectOrder, setCollectOrder] = useState<ReadyOrder | null>(null);
  const [collectCode, setCollectCode] = useState('');
  const [collectError, setCollectError] = useState<string | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<DashboardData>('/api/mobile/dashboard');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePay(order: ReadyOrder) {
    setError(null);
    setBusyOrderId(order.id);
    try {
      await apiPost(`/api/mobile/orders/${order.id}/payments`, { amount: order.balance, paymentMethod: 'mobile_money' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setBusyOrderId(null);
    }
  }

  function openCollect(order: ReadyOrder) {
    setCollectOrder(order);
    setCollectCode('');
    setCollectError(null);
  }

  async function handleCollect() {
    if (!collectOrder) return;
    setCollectError(null);
    setIsCollecting(true);
    try {
      await apiPost(`/api/mobile/orders/${collectOrder.id}/collect`, { pickupCode: collectCode });
      setCollectOrder(null);
      await load();
    } catch (err) {
      setCollectError(err instanceof Error ? err.message : 'Failed to collect order.');
    } finally {
      setIsCollecting(false);
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Colors.brand} />
      </ThemedView>
    );
  }

  if (data?.needsOnboarding) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="smallBold" style={{ textAlign: 'center', marginBottom: 8 }}>Almost there</ThemedText>
        <ThemedText themeColor="textSecondary" type="small" style={{ textAlign: 'center' }}>
          Set up your item types and services on the website before using the app.
        </ThemedText>
      </ThemedView>
    );
  }

  const isLocked = data?.subscriptionStatus === 'locked' || data?.subscriptionStatus === 'hard_block';
  const isAdmin = profile?.kind === 'employee' && profile.role === EMPLOYEE_ROLE.ADMIN;

  if (isLocked) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="smallBold" style={{ textAlign: 'center', marginBottom: 8 }}>
          {data?.subscriptionStatus === 'hard_block' ? 'Account in read-only mode' : 'Subscription expired'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small" style={{ textAlign: 'center', marginBottom: 16 }}>
          {data?.subscriptionStatus === 'hard_block'
            ? 'New orders are paused. Renew to restore full access.'
            : 'All operations are paused. Renew your subscription to continue.'}
        </ThemedText>
        <Button onPress={() => router.push('/settings/subscription')}>Pay now</Button>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
    >
      <View>
        <ThemedText type="title" style={{ color: Colors.brand }}>{profile?.kind === 'employee' ? profile.firstName : ''}</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">{data?.todayDate}</ThemedText>
      </View>

      {error && <ErrorBanner message={error} />}

      {data?.showSmsBanner && (
        <ErrorBanner
          message={`You've used ${Math.round((data.smsUsed / data.smsQuota) * 100)}% of this month's SMS allowance (${data.smsUsed}/${data.smsQuota}).`}
        />
      )}

      {data?.isFirstTime && (
        <Card style={{ backgroundColor: Colors.success.bg, borderColor: Colors.success.border }}>
          <ThemedText style={{ color: Colors.success.fg }}>You&apos;re all set up! Create your first order to get started.</ThemedText>
        </Card>
      )}

      {isAdmin && data?.adminStats && (
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <ThemedText themeColor="textSecondary" type="small">Orders today</ThemedText>
            <ThemedText type="smallBold">{data.adminStats.ordersToday}</ThemedText>
          </Card>
          <Card style={styles.statCard}>
            <ThemedText themeColor="textSecondary" type="small">Outstanding</ThemedText>
            <ThemedText type="smallBold" style={data.adminStats.outstandingBalance > 0 ? { color: Colors.error.fg } : undefined}>
              GHS {data.adminStats.outstandingBalance.toFixed(2)}
            </ThemedText>
          </Card>
          <Card style={styles.statCard}>
            <ThemedText themeColor="textSecondary" type="small">Active customers (7d)</ThemedText>
            <ThemedText type="smallBold">{data.adminStats.activeCustomersThisWeek}</ThemedText>
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <SectionLabel>{`Ready for collection${data?.readyOrders.length ? ` (${data.readyOrders.length})` : ''}`}</SectionLabel>
        {data?.readyOrders.length === 0 && <ThemedText themeColor="textSecondary" type="small">No orders waiting for collection.</ThemedText>}
        {data?.readyOrders.map(order => (
          <Card key={order.id} style={{ gap: 8 }}>
            <View>
              <ThemedText type="smallBold">{order.orderNumber} · {order.customerName}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">{order.phone} · {order.branchName}</ThemedText>
            </View>
            <View style={styles.row}>
              {order.balance > 0 ? (
                <Button variant="secondary" onPress={() => handlePay(order)} isPending={busyOrderId === order.id} style={{ flex: 1 }}>
                  {`Pay GHS ${order.balance.toFixed(2)}`}
                </Button>
              ) : (
                <Button onPress={() => openCollect(order)} style={{ flex: 1 }}>Collect</Button>
              )}
            </View>
          </Card>
        ))}
      </View>

      {!!data?.activities.length && (
        <View style={styles.section}>
          <SectionLabel>Recent activity</SectionLabel>
          {data.activities.map(a => (
            <Card key={a.id} style={{ gap: 2 }}>
              <ThemedText type="small">{a.description}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">{a.employeeName}</ThemedText>
            </Card>
          ))}
        </View>
      )}

      {collectOrder && (
        <Card style={styles.section}>
          <SectionLabel>{`Collect ${collectOrder.orderNumber}`}</SectionLabel>
          {collectError && <ErrorBanner message={collectError} />}
          <TextField
            value={collectCode}
            onChangeText={setCollectCode}
            placeholder="Pickup code"
            autoCapitalize="characters"
          />
          <View style={styles.row}>
            <Button variant="secondary" onPress={() => setCollectOrder(null)} style={{ flex: 1 }}>Cancel</Button>
            <Button onPress={handleCollect} isPending={isCollecting} style={{ flex: 1 }}>Confirm</Button>
          </View>
        </Card>
      )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
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
  section: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
});
