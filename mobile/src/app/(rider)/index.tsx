import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MyJobsView } from '@/components/rider/MyJobsView';
import { QueueView } from '@/components/rider/QueueView';
import { useAuth } from '@/contexts/AuthContext';
import { useRegisterRiderPush } from '@/hooks/useRegisterRiderPush';
import { Colors } from '@/constants/theme';
import { RIDER_ROLE } from '@/constants/statuses';

// Mirrors the website's RiderNav.tsx role split: an admin manages the roster
// + assigns jobs (queue), a field rider only sees/works jobs assigned to
// them — never both.
export default function RiderHome() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.kind === 'rider' && profile.role === RIDER_ROLE.ADMIN;
  useRegisterRiderPush();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: Colors.brand }}>
          {isAdmin ? 'Job Queue' : 'My Jobs'}
        </ThemedText>
        <View style={styles.headerActions}>
          {isAdmin && (
            <Pressable onPress={() => router.push('/roster')}>
              <ThemedText style={{ color: Colors.brand, fontWeight: '600' }}>Roster</ThemedText>
            </Pressable>
          )}
          <Pressable onPress={signOut}>
            <ThemedText themeColor="textSecondary">Sign out</ThemedText>
          </Pressable>
        </View>
      </View>

      {isAdmin ? <QueueView /> : <MyJobsView />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
});
