import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';
import { EMPLOYEE_ROLE } from '@/constants/statuses';
import { useAuth } from '@/contexts/AuthContext';

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <ThemedText style={{ fontWeight: '600' }}>{label}</ThemedText>
      <ThemedText themeColor="textSecondary">›</ThemedText>
    </Pressable>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  if (profile?.kind !== 'employee') return null;
  const isAdmin = profile.role === EMPLOYEE_ROLE.ADMIN;
  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <ThemedText style={{ color: Colors.brand, fontWeight: '700' }}>{initials}</ThemedText>
        </View>
        <View>
          <ThemedText type="smallBold">{profile.laundryName}</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {profile.firstName} {profile.lastName} · {isAdmin ? 'Admin' : 'Employee'}
          </ThemedText>
        </View>
      </View>

      <Card style={{ gap: 0 }}>
        <Row label="Customers" onPress={() => router.push('/customers')} />
        <View style={styles.rowBorder}>
          <Row label="Payments" onPress={() => router.push('/payments')} />
        </View>
        {isAdmin && (
          <View style={styles.rowBorder}>
            <Row label="Team" onPress={() => router.push('/employees')} />
          </View>
        )}
      </Card>

      {isAdmin && (
        <Card style={{ gap: 0 }}>
          <Row label="Items & Services" onPress={() => router.push('/items-and-services')} />
          <View style={styles.rowBorder}>
            <Row label="Reports" onPress={() => router.push('/reports')} />
          </View>
        </Card>
      )}

      <Card style={{ gap: 0 }}>
        <Row label="Help & Support" onPress={() => Linking.openURL('https://wa.me/233257528042')} />
        <View style={styles.rowBorder}>
          <Row label="Frequently Asked Questions" onPress={() => router.push('/account/faq')} />
        </View>
        <View style={styles.rowBorder}>
          <Row label="Terms of Service" onPress={() => Linking.openURL('https://rinsion.vercel.app/terms')} />
        </View>
        <View style={styles.rowBorder}>
          <Row label="Privacy Policy" onPress={() => Linking.openURL('https://rinsion.vercel.app/privacy')} />
        </View>
      </Card>

      {isAdmin && (
        <Card style={{ gap: 0 }}>
          <Row label="Settings" onPress={() => router.push('/settings')} />
        </Card>
      )}

      <Card>
        <Pressable onPress={signOut}>
          <ThemedText style={{ fontWeight: '600', color: Colors.error.fg }}>Sign out</ThemedText>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.brandPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundSelected,
  },
});
