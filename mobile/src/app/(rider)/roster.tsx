import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import type { PendingRiderInvite, RosterRider } from '@/types/riderJobs';

export default function RosterScreen() {
  const router = useRouter();
  const [roster, setRoster] = useState<RosterRider[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingRiderInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteNote, setInviteNote] = useState<{ text: string; link: string | null } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ roster: RosterRider[]; pendingInvites: PendingRiderInvite[] }>('/api/mobile/rider/roster');
      setRoster(data.roster);
      setPendingInvites(data.pendingInvites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the roster.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite() {
    if (!phone.trim()) {
      setError('Enter a phone number.');
      return;
    }
    setError(null);
    setInviteNote(null);
    setIsInviting(true);
    try {
      const data = await apiPost<{ linked: boolean; inviteLink: string | null }>('/api/mobile/rider/roster', {
        phone: phone.trim(),
      });
      setPhone('');
      setInviteNote(
        data.linked
          ? { text: 'Linked to their existing account — they can sign in right away.', link: null }
          : { text: 'Forward this link to the rider yourself — no SMS is sent.', link: data.inviteLink }
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite rider.');
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>

      <ThemedText type="title" style={{ color: Colors.brand }}>Roster</ThemedText>

      {error && <ErrorBanner message={error} />}

      <Card style={styles.section}>
        <SectionLabel>Invite a rider</SectionLabel>
        <TextField value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
        <Button onPress={handleInvite} isPending={isInviting}>Invite rider</Button>
        {inviteNote && (
          <View style={{ gap: 8 }}>
            <ThemedText type="small">{inviteNote.text}</ThemedText>
            {inviteNote.link && (
              <Button variant="secondary" onPress={() => Share.share({ message: inviteNote.link! })}>
                Share invite link
              </Button>
            )}
          </View>
        )}
      </Card>

      <View style={styles.section}>
        <SectionLabel>Riders</SectionLabel>
        {!isLoading && roster.length === 0 && <ThemedText themeColor="textSecondary">No riders yet.</ThemedText>}
        {roster.map(r => (
          <Card key={r.id} style={styles.riderRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="smallBold">{`${r.firstName} ${r.lastName}`.trim()}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">{r.phone}</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {r.role === 'admin' ? 'Admin' : 'Rider'}{!r.isActive ? ' · Inactive' : ''}
            </ThemedText>
          </Card>
        ))}
      </View>

      {pendingInvites.length > 0 && (
        <View style={styles.section}>
          <SectionLabel>Pending invites</SectionLabel>
          {pendingInvites.map(i => (
            <Card key={i.id} style={styles.riderRow}>
              <ThemedText type="small">{i.phone}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Invited</ThemedText>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText themeColor="textSecondary" type="small" style={styles.sectionLabel}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  riderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
