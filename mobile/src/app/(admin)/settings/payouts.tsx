import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';

interface BankChoice {
  name: string;
  code: string;
  isMobileMoney: boolean;
}

interface PayoutAccount {
  businessName: string;
  settlementBankCode: string;
  settlementBankName: string;
  accountNumber: string;
  accountName: string | null;
  isVerified: boolean;
  status: 'pending' | 'active' | 'disabled';
}

export default function PayoutsScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [banks, setBanks] = useState<BankChoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ account: PayoutAccount | null; banks: BankChoice[] }>('/api/mobile/settings/payouts');
      setAccount(data.account);
      setBanks(data.banks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payout account.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleVerify() {
    setError(null);
    setIsVerifying(true);
    try {
      const res = await apiPost<{ accountName: string }>('/api/mobile/settings/payouts', {
        action: 'verify',
        accountNumber,
        settlementBankCode: bankCode,
      });
      setResolvedName(res.accountName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve this account number.');
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      await apiPost('/api/mobile/settings/payouts', {
        action: 'save',
        businessName,
        settlementBankCode: bankCode,
        settlementBankName: bankName,
        accountNumber,
        accountName: resolvedName ?? undefined,
      });
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payout account.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Colors.brand} />
      </ThemedView>
    );
  }

  const canVerify = !!bankCode && accountNumber.length >= 6;
  const canSave = !!bankCode && accountNumber.length >= 6 && businessName.trim().length > 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Settings</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.brand }}>Payouts</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        Customer order payments settle directly into this account — Rinsion never holds the money.
      </ThemedText>

      {error && <ErrorBanner message={error} />}

      {account?.status === 'active' ? (
        <Card style={styles.section}>
          <ThemedText type="smallBold">{account.businessName}</ThemedText>
          <ThemedText type="small">{account.settlementBankName}</ThemedText>
          <ThemedText type="small">•••• {account.accountNumber.slice(-4)}</ThemedText>
          {account.accountName && <ThemedText type="small">{account.accountName}</ThemedText>}
          <ThemedText themeColor="textSecondary" type="small">
            To change these details, contact Rinsion directly.
          </ThemedText>
        </Card>
      ) : saved ? (
        <Card style={styles.section}>
          <ThemedText type="smallBold" style={{ color: Colors.success.fg }}>Payout account saved.</ThemedText>
        </Card>
      ) : (
        <Card style={styles.section}>
          <TextField
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Business name"
          />

          <ThemedText type="small" themeColor="textSecondary">Mobile Money</ThemedText>
          <View style={styles.chipWrap}>
            {banks.filter(b => b.isMobileMoney).map(b => (
              <Chip
                key={b.code}
                selected={bankCode === b.code}
                onPress={() => { setBankCode(b.code); setBankName(b.name); setResolvedName(null); }}
              >
                {b.name}
              </Chip>
            ))}
          </View>

          <ThemedText type="small" themeColor="textSecondary">Banks</ThemedText>
          <View style={styles.chipWrap}>
            {banks.filter(b => !b.isMobileMoney).map(b => (
              <Chip
                key={b.code}
                selected={bankCode === b.code}
                onPress={() => { setBankCode(b.code); setBankName(b.name); setResolvedName(null); }}
              >
                {b.name}
              </Chip>
            ))}
          </View>

          <TextField
            value={accountNumber}
            onChangeText={t => { setAccountNumber(t); setResolvedName(null); }}
            placeholder="Account number"
            keyboardType="phone-pad"
          />

          {resolvedName ? (
            <ThemedText type="small" style={{ color: Colors.success.fg }}>Verified: {resolvedName}</ThemedText>
          ) : (
            <Button variant="secondary" onPress={handleVerify} isPending={isVerifying} disabled={!canVerify}>
              Verify account
            </Button>
          )}

          <Button onPress={handleSave} isPending={isSaving} disabled={!canSave}>
            Save payout account
          </Button>
        </Card>
      )}
    </ScrollView>
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
