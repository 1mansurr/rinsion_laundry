import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { toAuthPhone } from '@/utils/toAuthPhone';

type Identity = 'phone' | 'email';

// Mirrors the website's /login phone/email toggle — riders only ever have
// phone, but some staff accounts were set up with email instead.
export default function LoginScreen() {
  const [identity, setIdentity] = useState<Identity>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    if (!password) {
      setError('Password is required.');
      return;
    }

    let signInError;
    if (identity === 'phone') {
      const normalizedPhone = toAuthPhone(phone);
      if (!normalizedPhone) {
        setError('Enter a valid phone number.');
        return;
      }
      setError(null);
      setIsSubmitting(true);
      ({ error: signInError } = await supabase.auth.signInWithPassword({ phone: normalizedPhone, password }));
    } else {
      if (!email.trim()) {
        setError('Enter your email.');
        return;
      }
      setError(null);
      setIsSubmitting(true);
      ({ error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }));
    }
    setIsSubmitting(false);

    if (signInError) {
      setError(identity === 'phone' ? 'Invalid phone or password.' : 'Invalid email or password.');
    }
    // On success, RootNavigator picks up the new session automatically.
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Rinsion
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Sign in to continue
      </ThemedText>

      <Card style={styles.card}>
        {error && <ErrorBanner message={error} />}

        <View style={styles.toggle}>
          <Button
            variant={identity === 'phone' ? 'primary' : 'secondary'}
            onPress={() => setIdentity('phone')}
            style={styles.toggleOption}
          >
            Phone
          </Button>
          <Button
            variant={identity === 'email' ? 'primary' : 'secondary'}
            onPress={() => setIdentity('email')}
            style={styles.toggleOption}
          >
            Email
          </Button>
        </View>

        {identity === 'phone' ? (
          <TextField
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        ) : (
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        )}

        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          autoComplete="current-password"
        />

        <Button onPress={handleSignIn} isPending={isSubmitting} style={styles.submitButton}>
          Sign in
        </Button>
      </Card>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: Colors.background,
  },
  title: {
    textAlign: 'center',
    color: Colors.brand,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    gap: 12,
    borderRadius: Radius.lg,
  },
  toggle: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleOption: {
    flex: 1,
  },
  submitButton: {
    marginTop: 8,
  },
});
