import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

// Reached only if a session exists but neither an employees nor riders row
// matches it — e.g. an invite was never completed. Mirrors the website's
// (app)/layout.tsx redirect-to-/signup/choose comment: middleware/session
// guarantees a valid auth.users account, not that it's linked to a tenant.
export default function NoAccessScreen() {
  const { signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ color: Colors.brand }}>No account found</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        This phone number isn&apos;t linked to a laundry or rider company yet. If you were
        invited, make sure you finished setting up your account first.
      </ThemedText>
      <Button onPress={signOut} style={styles.button}>Sign out</Button>
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
  },
});
