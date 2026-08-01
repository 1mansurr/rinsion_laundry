import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';

/**
 * M1 placeholder — proves auth + role routing end to end. Replaced by the
 * real screens in M2 (laundry admin) / M4 (rider side).
 */
export function PlaceholderHome({ sectionLabel }: { sectionLabel: string }) {
  const { profile, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{sectionLabel}</ThemedText>
      {profile && (
        <ThemedText themeColor="textSecondary">
          Signed in as {profile.firstName} {profile.lastName} · {profile.role}
        </ThemedText>
      )}
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
    paddingHorizontal: 24,
  },
  button: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#B91C1C',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#B91C1C',
    fontWeight: '600',
  },
});
