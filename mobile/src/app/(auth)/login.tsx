import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { toAuthPhone } from '@/utils/toAuthPhone';

type Identity = 'phone' | 'email';

// Mirrors the website's /login phone/email toggle — riders only ever have
// phone, but some staff accounts were set up with email instead.
export default function LoginScreen() {
  const theme = useTheme();
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

      {error && (
        <ThemedView style={[styles.errorBanner, { backgroundColor: '#FEE2E2' }]}>
          <ThemedText style={{ color: '#B91C1C' }}>{error}</ThemedText>
        </ThemedView>
      )}

      <View style={[styles.toggle, { borderColor: theme.backgroundSelected }]}>
        <Pressable
          onPress={() => setIdentity('phone')}
          style={[styles.toggleOption, identity === 'phone' && { backgroundColor: theme.backgroundSelected }]}
        >
          <ThemedText type="small">Phone</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setIdentity('email')}
          style={[styles.toggleOption, identity === 'email' && { backgroundColor: theme.backgroundSelected }]}
        >
          <ThemedText type="small">Email</ThemedText>
        </Pressable>
      </View>

      {identity === 'phone' ? (
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor={theme.textSecondary}
          keyboardType="phone-pad"
          autoComplete="tel"
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        />
      ) : (
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={theme.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        />
      )}

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        autoComplete="current-password"
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
      />

      <Pressable
        onPress={handleSignIn}
        disabled={isSubmitting}
        style={[styles.button, { opacity: isSubmitting ? 0.6 : 1 }]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FAF8F5" />
        ) : (
          <ThemedText style={styles.buttonText}>Sign in</ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBanner: {
    borderRadius: 12,
    padding: 12,
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2F6B4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FAF8F5',
    fontWeight: '600',
  },
});
