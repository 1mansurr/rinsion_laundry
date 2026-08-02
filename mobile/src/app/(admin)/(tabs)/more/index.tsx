import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';

/**
 * Catch-all for anything that doesn't need its own tab — as
 * Employees/Items & Services/Reports/Settings (M10-M13) get built, their
 * entry points land here rather than adding more top-level tabs.
 */
export default function MoreScreen() {
  const { signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ color: Colors.brand }}>More</ThemedText>

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
