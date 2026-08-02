import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Colors } from '@/constants/theme';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/utils/formatDate';
import type { SmsUsageData } from '@/types/settings';

export default function SmsUsageScreen() {
  const router = useRouter();
  const [data, setData] = useState<SmsUsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<SmsUsageData>('/api/mobile/settings/sms-usage');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SMS usage.');
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Settings</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.brand }}>SMS usage</ThemedText>

      {error && <ErrorBanner message={error} />}

      {data && (
        <Card style={styles.section}>
          <ThemedText type="smallBold">{data.smsUsed} of {data.quota} used ({data.usagePct}%)</ThemedText>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${data.usagePct}%` }]} />
          </View>
          {data.subscription && (
            <ThemedText themeColor="textSecondary" type="small">
              Cycle: {formatDate(data.subscription.cycleStartDate)} – {formatDate(data.subscription.cycleEndDate)}
            </ThemedText>
          )}
        </Card>
      )}

      <View style={styles.section}>
        <SectionLabel>Recent messages</SectionLabel>
        {data?.messages.length === 0 && <ThemedText themeColor="textSecondary" type="small">No messages sent yet.</ThemedText>}
        {data?.messages.map(m => (
          <Card key={m.id} style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="smallBold">{m.trigger_event}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">{m.phone} · {formatDate(m.created_at)}</ThemedText>
            </View>
            <ThemedText
              type="small"
              style={{ color: m.status === 'failed' ? Colors.error.fg : Colors.success.fg, fontWeight: '600' }}
            >
              {m.counts_toward_cap ? m.status : 'Free'}
            </ThemedText>
          </Card>
        ))}
      </View>
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
  section: {
    gap: 8,
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
    backgroundColor: Colors.brand,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
