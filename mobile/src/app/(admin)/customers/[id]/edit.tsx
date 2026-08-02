import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import type { CustomerDetail } from '@/types/customers';

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ customer: CustomerDetail }>(`/api/mobile/customers/${id}`);
      setFirstName(data.customer.firstName);
      setLastName(data.customer.lastName);
      setPhone(data.customer.phone);
      setLocation(data.customer.location ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('First name, last name, and phone are required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await apiPost(`/api/mobile/customers/${id}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        location: location.trim() || undefined,
      });
      router.replace(`/customers/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer.');
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Cancel</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.brand }}>Edit customer</ThemedText>

      {error && <ErrorBanner message={error} />}

      <Card style={{ gap: 8 }}>
        <TextField value={firstName} onChangeText={setFirstName} placeholder="First name" />
        <TextField value={lastName} onChangeText={setLastName} placeholder="Last name" />
        <TextField value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
        <TextField value={location} onChangeText={setLocation} placeholder="Location (optional)" />
      </Card>

      <Button onPress={handleSubmit} isPending={isSubmitting}>
        Save changes
      </Button>
    </ScrollView>
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
});
