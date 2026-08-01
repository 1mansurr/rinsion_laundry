import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';

// Reached only if a session exists but neither an employees nor riders row
// matches it — e.g. an invite was never completed. Mirrors the website's
// (app)/layout.tsx redirect-to-/signup/choose comment: middleware/session
// guarantees a valid auth.users account, not that it's linked to a tenant.
export default function NoAccessScreen() {
  const { signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">No account found</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        This phone number isn&apos;t linked to a laundry or rider company yet. If you were
        invited, make sure you finished setting up your account first.
      </ThemedText>
      <Pressable onPress={signOut} style={styles.button}>
        <ThemedText style={styles.buttonText}>Sign out</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  body: {
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#2F6B4F',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#FAF8F5',
    fontWeight: '600',
  },
});
