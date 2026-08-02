import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { EMPLOYEE_ROLE, EMPLOYEE_ROLE_LABELS, type EmployeeRole } from '@/constants/statuses';
import type { Employee, PendingInvite, PendingJoinRequest } from '@/types/employees';

interface LoadResult {
  employees: Employee[];
  pendingInvites: PendingInvite[];
  pendingJoinRequests: PendingJoinRequest[];
  employeeLimit: number;
  activeCount: number;
}

export default function EmployeesScreen() {
  const router = useRouter();
  const [data, setData] = useState<LoadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<EmployeeRole>(EMPLOYEE_ROLE.EMPLOYEE);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteNote, setInviteNote] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<LoadResult>('/api/mobile/employees');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite() {
    if (!invitePhone.trim()) {
      setError('Enter a phone number.');
      return;
    }
    setError(null);
    setInviteNote(null);
    setIsInviting(true);
    try {
      const result = await apiPost<{ linked: boolean }>('/api/mobile/employees', { phone: invitePhone.trim(), role: inviteRole });
      setInvitePhone('');
      setInviteNote(result.linked ? 'Linked to their existing account.' : 'Invite sent by SMS.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite employee.');
    } finally {
      setIsInviting(false);
    }
  }

  async function handleToggle(employee: Employee) {
    setError(null);
    setBusyId(employee.id);
    try {
      await apiPost(`/api/mobile/employees/${employee.id}/toggle`, { isActive: !employee.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee.');
    } finally {
      setBusyId(null);
    }
  }

  function handleRemove(employee: Employee) {
    Alert.alert('Remove employee', `Remove ${employee.firstName} ${employee.lastName} from the team?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setError(null);
          setBusyId(employee.id);
          try {
            await apiPost(`/api/mobile/employees/${employee.id}/remove`, {});
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove employee.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  async function handleResendInvite(inviteId: string) {
    setError(null);
    setBusyId(inviteId);
    try {
      await apiPost(`/api/mobile/employees/invites/${inviteId}/resend`, {});
      Alert.alert('Invite resent');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invite.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleJoinRequest(requestId: string, action: 'approve' | 'reject') {
    setError(null);
    setBusyId(requestId);
    try {
      await apiPost(`/api/mobile/employees/join-requests/${requestId}`, { action, role: EMPLOYEE_ROLE.EMPLOYEE });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Back</ThemedText>
      </Pressable>

      <View>
        <ThemedText type="title" style={{ color: Colors.brand }}>Team</ThemedText>
        {data && (
          <ThemedText themeColor="textSecondary" type="small">
            {data.activeCount} of {data.employeeLimit} slots used
          </ThemedText>
        )}
      </View>

      {error && <ErrorBanner message={error} />}

      <Card style={styles.section}>
        <SectionLabel>Invite staff</SectionLabel>
        <TextField value={invitePhone} onChangeText={setInvitePhone} placeholder="Phone number" keyboardType="phone-pad" />
        <View style={styles.chipRow}>
          {(Object.values(EMPLOYEE_ROLE) as EmployeeRole[]).map(r => (
            <Chip key={r} selected={inviteRole === r} onPress={() => setInviteRole(r)}>
              {EMPLOYEE_ROLE_LABELS[r]}
            </Chip>
          ))}
        </View>
        <Button onPress={handleInvite} isPending={isInviting}>Invite</Button>
        {inviteNote && <ThemedText type="small">{inviteNote}</ThemedText>}
      </Card>

      {!!data?.pendingJoinRequests.length && (
        <View style={styles.section}>
          <SectionLabel>Join requests</SectionLabel>
          {data.pendingJoinRequests.map(r => (
            <Card key={r.id} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="smallBold">{r.firstName} {r.lastName}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">{r.phone} · {r.email}</ThemedText>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button onPress={() => handleJoinRequest(r.id, 'approve')} isPending={busyId === r.id}>Approve</Button>
                <Button variant="destructive" onPress={() => handleJoinRequest(r.id, 'reject')} isPending={busyId === r.id}>Reject</Button>
              </View>
            </Card>
          ))}
        </View>
      )}

      {!!data?.pendingInvites.length && (
        <View style={styles.section}>
          <SectionLabel>Pending invites</SectionLabel>
          {data.pendingInvites.map(i => (
            <Card key={i.id} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="smallBold">{i.phone}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">{EMPLOYEE_ROLE_LABELS[i.role]} · Invited</ThemedText>
              </View>
              <Button variant="secondary" onPress={() => handleResendInvite(i.id)} isPending={busyId === i.id}>Resend</Button>
            </Card>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <SectionLabel>Team</SectionLabel>
        {!isLoading && data?.employees.length === 0 && <ThemedText themeColor="textSecondary">No employees yet.</ThemedText>}
        {data?.employees.map(e => (
          <Card key={e.id} style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="smallBold">{e.firstName} {e.lastName}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {e.phone} · {EMPLOYEE_ROLE_LABELS[e.role]}{!e.isActive ? ' · Inactive' : ''}
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Switch value={e.isActive} onValueChange={() => handleToggle(e)} disabled={busyId === e.id} />
              <Pressable onPress={() => handleRemove(e)} disabled={busyId === e.id}>
                <ThemedText style={{ color: Colors.error.fg }}>Remove</ThemedText>
              </Pressable>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText themeColor="textSecondary" type="small" style={{ letterSpacing: 0.5 }}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 48,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
