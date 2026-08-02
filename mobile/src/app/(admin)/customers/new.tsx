import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiPost } from '@/lib/api';

export default function NewCustomerScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('First name, last name, and phone are required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await apiPost<{ customer: { id: string } }>('/api/mobile/customers', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        location: location.trim() || undefined,
      });
      router.replace(`/customers/${data.customer.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer.');
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Cancel</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.brand }}>New customer</ThemedText>

      {error && <ErrorBanner message={error} />}

      <Card style={{ gap: 8 }}>
        <TextField value={firstName} onChangeText={setFirstName} placeholder="First name" />
        <TextField value={lastName} onChangeText={setLastName} placeholder="Last name" />
        <TextField value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
        <TextField value={location} onChangeText={setLocation} placeholder="Location (optional)" />
      </Card>

      <View style={styles.row}>
        <Button onPress={handleSubmit} isPending={isSubmitting} style={{ flex: 1 }}>
          Save customer
        </Button>
      </View>

      <ThemedText themeColor="textSecondary" type="small" style={{ textAlign: 'center' }}>
        If this phone number already exists, the existing customer will be returned.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
});
