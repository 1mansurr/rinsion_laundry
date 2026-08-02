import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import type { Branch } from '@/types/settings';

export default function BranchesSettingsScreen() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchLimit, setBranchLimit] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ branches: Branch[]; branchLimit: number }>('/api/mobile/settings/branches');
      setBranches(data.branches);
      setBranchLimit(data.branchLimit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setError(null);
    setIsAdding(true);
    try {
      await apiPost('/api/mobile/settings/branches', { name: newName.trim() });
      setNewName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add branch.');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <ThemedText themeColor="textSecondary">← Settings</ThemedText>
      </Pressable>
      <ThemedText type="title" style={{ color: Colors.brand }}>Branches</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">{branches.length} of {branchLimit} slots used</ThemedText>

      {error && <ErrorBanner message={error} />}

      {!isLoading && branches.map((b, i) => (
        <Card key={b.id} style={styles.row}>
          <ThemedText type="smallBold">{b.name}</ThemedText>
          {i === 0 && <ThemedText themeColor="textSecondary" type="small">Main</ThemedText>}
        </Card>
      ))}

      {branches.length < branchLimit && (
        <Card style={styles.row}>
          <TextField value={newName} onChangeText={setNewName} placeholder="New branch name" style={{ flex: 1 }} />
          <Button onPress={handleAdd} isPending={isAdding}>Add</Button>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 48,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
