import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { formatDate } from '@/utils/formatDate';
import type { SubscriptionPageData } from '@/types/settings';

export default function SubscriptionScreen() {
  const router = useRouter();
  const [data, setData] = useState<SubscriptionPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const load = useCallback(async (action?: 'renew' | 'convert', selectedPlan?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (selectedPlan) params.set('selectedPlan', selectedPlan);
      const qs = params.toString();
      const result = await apiGet<SubscriptionPageData>(`/api/mobile/settings/subscription${qs ? `?${qs}` : ''}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStartTrial() {
    setError(null);
    setIsSubmitting(true);
    try {
      await apiPost('/api/mobile/settings/subscription', { action: 'startTrial' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start trial.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClaim() {
    if (!data?.referenceCode || !data.paymentType || !data.targetPlan) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await apiPost('/api/mobile/settings/subscription', {
        action: 'claim',
        referenceCode: data.referenceCode,
        paymentType: data.paymentType,
        targetPlan: data.targetPlan,
      });
      setClaimed(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment claim.');
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

  const sub = data?.subscription;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Settings</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.brand }}>Subscription</ThemedText>

      {error && <ErrorBanner message={error} />}

      {!sub ? (
        <Card style={styles.section}>
          <ThemedText type="smallBold">No subscription yet</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">Start your 14-day free trial to unlock the app.</ThemedText>
          <Button onPress={handleStartTrial} isPending={isSubmitting}>Start free trial</Button>
        </Card>
      ) : (
        <>
          <Card style={styles.section}>
            <ThemedText type="smallBold">{sub.plan.toUpperCase()} · {sub.status}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {formatDate(sub.cycleStartDate)} – {formatDate(sub.cycleEndDate)} · {sub.daysLeft} days left
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {sub.employeeLimit} employee slots · {sub.smsQuota} SMS/cycle
            </ThemedText>
          </Card>

          {data?.existingClaim ? (
            <Card style={styles.section}>
              <ThemedText type="smallBold">Payment claim pending</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                Ref {data.existingClaim.reference_code} · GHS {data.existingClaim.claimed_amount.toFixed(2)} · Submitted {formatDate(data.existingClaim.claimed_at)}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">We&apos;ll confirm this once we&apos;ve verified the transfer.</ThemedText>
            </Card>
          ) : data?.paymentType && data.referenceCode ? (
            <Card style={styles.section}>
              <ThemedText type="smallBold">Send payment via MoMo</ThemedText>
              <ThemedText type="small">MoMo number: {data.momoNumber}</ThemedText>
              <ThemedText type="small">Amount: GHS {data.paymentAmount?.toFixed(2)}</ThemedText>
              <ThemedText type="small">Reference: {data.referenceCode}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                Include the reference in the MoMo note, then confirm below once sent.
              </ThemedText>
              {claimed ? (
                <ThemedText type="small" style={{ color: Colors.success.fg }}>Claim submitted — awaiting confirmation.</ThemedText>
              ) : (
                <Button onPress={handleClaim} isPending={isSubmitting}>
                  {`I have sent GHS ${data.paymentAmount?.toFixed(2)}`}
                </Button>
              )}
            </Card>
          ) : (
            <View style={styles.row}>
              <Button onPress={() => load('renew')} style={{ flex: 1 }}>Renew</Button>
              {sub.plan === 'trial' && (
                <Button variant="secondary" onPress={() => load('convert', 'starter')} style={{ flex: 1 }}>
                  Convert to Starter
                </Button>
              )}
            </View>
          )}

          {!!data?.recentPayments.length && (
            <View style={styles.section}>
              <SectionLabel>Recent payments</SectionLabel>
              {data.recentPayments.map(p => (
                <Card key={p.id} style={styles.row}>
                  <ThemedText type="small">{p.plan_at_payment} · {p.payment_type}</ThemedText>
                  <ThemedText type="smallBold">GHS {p.amount.toFixed(2)}</ThemedText>
                </Card>
              ))}
            </View>
          )}
        </>
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
  section: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
