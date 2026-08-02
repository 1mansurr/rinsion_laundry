import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Colors } from '@/constants/theme';
import { apiGet } from '@/lib/api';
import { STATUS_LABELS } from '@/constants/statuses';
import type { AllReports } from '@/types/reports';

const STATUS_ORDER = ['received', 'processing', 'ready', 'collected', 'cancelled'] as const;

const STATUS_COLORS: Record<string, string> = {
  received: '#8C857B',
  processing: '#B8801F',
  ready: '#0F3D2E',
  collected: '#5E7A6B',
  cancelled: '#B0413A',
};

export default function ReportsScreen() {
  const router = useRouter();
  const [data, setData] = useState<AllReports | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<AllReports>('/api/mobile/reports');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Colors.brand} />
      </ThemedView>
    );
  }

  const thisMonthLabel = new Date().toLocaleString('default', { month: 'long' });
  const totalOrders = data?.orders.totalAllTime || 1;

  const revCards = data ? [
    { label: 'All time revenue', value: data.revenue.totalAllTime },
    { label: `${thisMonthLabel}`, value: data.revenue.thisMonth },
    { label: 'Today', value: data.revenue.today },
    { label: 'Outstanding', value: data.revenue.outstandingBalance, warn: data.revenue.outstandingBalance > 0 },
  ] : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>

      <ThemedText type="title" style={{ color: Colors.brand }}>Reports</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">All time · All branches</ThemedText>

      {error && <ErrorBanner message={error} />}

      <View style={styles.statsGrid}>
        {revCards.map(c => (
          <Card key={c.label} style={styles.statCard}>
            <ThemedText themeColor="textSecondary" type="small">{c.label}</ThemedText>
            <ThemedText type="smallBold" style={c.warn ? { color: Colors.error.fg } : undefined}>
              GHS {c.value.toFixed(2)}
            </ThemedText>
          </Card>
        ))}
      </View>

      {data && (
        <Card style={styles.section}>
          <SectionLabel>Orders by status</SectionLabel>
          {STATUS_ORDER.map(s => {
            const count = data.orders.byStatus[s] ?? 0;
            const pct = Math.round((count / totalOrders) * 100);
            return (
              <View key={s} style={{ gap: 4 }}>
                <View style={styles.barLabelRow}>
                  <ThemedText type="small">{STATUS_LABELS[s] ?? s}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{count} · {pct}%</ThemedText>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: STATUS_COLORS[s] }]} />
                </View>
              </View>
            );
          })}
          <ThemedText themeColor="textSecondary" type="small" style={{ marginTop: 4 }}>
            {data.orders.totalAllTime} total orders · {data.orders.today} today
          </ThemedText>
        </Card>
      )}

      {data && (
        <View style={styles.section}>
          <SectionLabel>{`Employee activity — ${thisMonthLabel}`}</SectionLabel>
          {data.employeeActivity.length === 0 ? (
            <ThemedText themeColor="textSecondary" type="small">No activity this month.</ThemedText>
          ) : (
            data.employeeActivity.map(e => (
              <Card key={e.employeeId} style={styles.row}>
                <ThemedText type="smallBold" style={{ flex: 1 }}>{e.name}</ThemedText>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText type="small">{e.ordersCreated} orders · {e.paymentsRecorded} payments</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">{e.statusUpdates} updates</ThemedText>
                </View>
              </Card>
            ))
          )}
        </View>
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
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 4,
  },
  section: {
    gap: 10,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.backgroundSelected,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
