import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';

/**
 * M1 placeholder — proves auth + role routing end to end. Replaced by the
 * real screens in M2 (laundry admin) / M4 (rider side).
 */
export function PlaceholderHome({ sectionLabel }: { sectionLabel: string }) {
  const { profile, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ color: Colors.brand }}>{sectionLabel}</ThemedText>
      {profile && (
        <ThemedText themeColor="textSecondary">
          Signed in as {profile.firstName} {profile.lastName} · {profile.role}
        </ThemedText>
      )}
      <Button variant="destructive" onPress={signOut} style={styles.button}>
        Sign out
      </Button>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  button: {
    marginTop: 24,
  },
});
