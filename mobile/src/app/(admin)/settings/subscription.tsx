import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { formatDate } from '@/utils/formatDate';
import type { SubscriptionPageData } from '@/types/settings';

const MOMO_PROVIDERS: { value: 'mtn' | 'vod' | 'tgo'; label: string }[] = [
  { value: 'mtn', label: 'MTN' },
  { value: 'vod', label: 'Telecel' },
  { value: 'tgo', label: 'AirtelTigo' },
];

const POLL_TIMEOUT_MS = 2 * 60 * 1000;

export default function SubscriptionScreen() {
  const router = useRouter();
  const [data, setData] = useState<SubscriptionPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'vod' | 'tgo'>('mtn');
  const [isPaying, setIsPaying] = useState(false);
  const lastParamsRef = useRef<{ action?: 'renew' | 'convert'; selectedPlan?: string }>({});
  const pollStartRef = useRef<{ ref: string; start: number } | null>(null);

  const load = useCallback(async (action?: 'renew' | 'convert', selectedPlan?: string, opts?: { silent?: boolean }) => {
    lastParamsRef.current = { action, selectedPlan };
    if (!opts?.silent) setIsLoading(true);
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
      if (!opts?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Prefill from the employee's own phone once, same as the website.
  useEffect(() => {
    if (data?.employeePhone && !phone) setPhone(data.employeePhone);
  }, [data?.employeePhone, phone]);

  // Poll every 3s for up to ~2min while a Paystack charge is awaiting the
  // customer's PIN confirmation — mirrors the website's PaystackPayButton.
  useEffect(() => {
    const link = data?.paystackLink;
    if (!link || link.status !== 'pending') {
      pollStartRef.current = null;
      return;
    }
    if (!pollStartRef.current || pollStartRef.current.ref !== link.referenceCode) {
      pollStartRef.current = { ref: link.referenceCode, start: Date.now() };
    }
    if (Date.now() - pollStartRef.current.start > POLL_TIMEOUT_MS) return;

    const timer = setTimeout(() => {
      load(lastParamsRef.current.action, lastParamsRef.current.selectedPlan, { silent: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [data, load]);

  async function handlePayMoMo() {
    if (!data?.paymentType || !data.targetPlan || !phone) return;
    setError(null);
    setIsPaying(true);
    try {
      await apiPost('/api/mobile/settings/subscription', {
        action: 'initiatePaystack',
        paymentType: data.paymentType,
        targetPlan: data.targetPlan,
        phone,
        provider,
      });
      await load(lastParamsRef.current.action, lastParamsRef.current.selectedPlan, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start payment.');
    } finally {
      setIsPaying(false);
    }
  }

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
            <>
              {(data.paymentType === 'cycle_renewal' || data.paymentType === 'trial_conversion') && (
                <Card style={styles.section}>
                  <ThemedText type="smallBold">Pay via Mobile Money</ThemedText>
                  {data.paystackLink?.status === 'pending' ? (
                    <>
                      <ThemedText type="small">
                        {data.paystackLink.displayText ?? 'Check your phone to enter your PIN'}
                      </ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator color={Colors.brand} size="small" />
                        <ThemedText themeColor="textSecondary" type="small">Waiting for confirmation…</ThemedText>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.row}>
                        {MOMO_PROVIDERS.map(p => (
                          <Pressable
                            key={p.value}
                            onPress={() => setProvider(p.value)}
                            style={[
                              styles.providerPill,
                              provider === p.value && { backgroundColor: Colors.brand },
                            ]}
                          >
                            <ThemedText
                              type="small"
                              style={{ color: provider === p.value ? '#FAF8F5' : Colors.text }}
                            >
                              {p.label}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>
                      <TextField
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="0XX XXX XXXX"
                        keyboardType="phone-pad"
                      />
                      <Button onPress={handlePayMoMo} isPending={isPaying} disabled={!phone}>
                        {`Pay GHS ${data.paymentAmount?.toFixed(2)} via Mobile Money`}
                      </Button>
                    </>
                  )}
                </Card>
              )}

              <Card style={styles.section}>
                <ThemedText type="smallBold">Or pay manually</ThemedText>
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
            </>
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
  providerPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.backgroundSelected,
    alignItems: 'center',
  },
});
