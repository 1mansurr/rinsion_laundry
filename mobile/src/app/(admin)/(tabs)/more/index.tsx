import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';

/**
 * Catch-all for anything that doesn't need its own tab.
 */
export default function MoreScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ color: Colors.brand }}>More</ThemedText>

      <Card style={{ gap: 0 }}>
        <Pressable onPress={() => router.push('/employees')} style={styles.row}>
          <ThemedText style={{ fontWeight: '600' }}>Team</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/items-and-services')} style={styles.row}>
          <ThemedText style={{ fontWeight: '600' }}>Items & Services</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/reports')} style={styles.row}>
          <ThemedText style={{ fontWeight: '600' }}>Reports</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} style={styles.row}>
          <ThemedText style={{ fontWeight: '600' }}>Settings</ThemedText>
        </Pressable>
      </Card>

      <Card>
        <Pressable onPress={signOut}>
          <View style={styles.row}>
            <ThemedText style={{ fontWeight: '600' }}>Sign out</ThemedText>
          </View>
        </Pressable>
      </Card>
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
  row: {
    paddingVertical: 4,
  },
});
