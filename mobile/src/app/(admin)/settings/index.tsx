import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';

const ITEMS: { label: string; path: '/settings/laundry' | '/settings/branches' | '/settings/pricing-model' | '/settings/workflow' | '/settings/subscription' | '/settings/payouts' | '/settings/sms-usage' | '/settings/recycle-bin' }[] = [
  { label: 'Laundry profile', path: '/settings/laundry' },
  { label: 'Branches', path: '/settings/branches' },
  { label: 'Pricing model', path: '/settings/pricing-model' },
  { label: 'Workflow', path: '/settings/workflow' },
  { label: 'Subscription', path: '/settings/subscription' },
  { label: 'Payouts', path: '/settings/payouts' },
  { label: 'SMS usage', path: '/settings/sms-usage' },
  { label: 'Recycle bin', path: '/settings/recycle-bin' },
];

export default function SettingsHubScreen() {
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.brand }}>Settings</ThemedText>

      <Card style={{ gap: 0 }}>
        {ITEMS.map((item, i) => (
          <Pressable key={item.path} onPress={() => router.push(item.path)} style={[styles.row, i > 0 && styles.rowBorder]}>
            <ThemedText style={{ fontWeight: '600' }}>{item.label}</ThemedText>
          </Pressable>
        ))}
      </Card>

      <Card style={{ borderColor: Colors.error.border, backgroundColor: Colors.error.bg }}>
        <Pressable onPress={() => router.push('/settings/danger-zone')}>
          <ThemedText style={{ fontWeight: '600', color: Colors.error.fg }}>Danger zone</ThemedText>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 48,
    gap: 16,
  },
  row: {
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundSelected,
  },
});
