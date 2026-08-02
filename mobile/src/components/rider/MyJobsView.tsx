import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Colors } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { NEXT_RIDER_JOB_STATUSES, RIDER_JOB_STATUS_LABELS, type RiderJobStatus } from '@/constants/statuses';
import type { MyJob } from '@/types/riderJobs';

const KIND_LABELS: Record<MyJob['kind'], string> = { pickup: 'Pickup', delivery: 'Delivery' };

export function MyJobsView() {
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<RiderJobStatus | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ jobs: MyJob[] }>('/api/mobile/rider/jobs');
      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAccept(jobId: string) {
    setError(null);
    setBusyJobId(jobId);
    try {
      await apiPost('/api/mobile/rider/jobs/accept', { jobId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept job.');
    } finally {
      setBusyJobId(null);
    }
  }

  function toggleSelected(jobId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  async function handleBulkUpdate() {
    if (!bulkTarget || selectedIds.size === 0) return;
    setError(null);
    setIsBulkUpdating(true);
    try {
      await apiPost('/api/mobile/rider/jobs/status', { jobIds: Array.from(selectedIds), status: bulkTarget });
      setSelectedIds(new Set());
      setBulkTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setIsBulkUpdating(false);
    }
  }

  const needsAcceptance = jobs.filter(j => !j.accepted);
  const active = jobs.filter(j => j.accepted);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
    >
      {error && <ErrorBanner message={error} />}

      {!isLoading && jobs.length === 0 && (
        <ThemedText themeColor="textSecondary">No jobs assigned right now.</ThemedText>
      )}

      {needsAcceptance.length > 0 && (
        <View style={styles.section}>
          <SectionLabel>Needs your acceptance</SectionLabel>
          {needsAcceptance.map(job => (
            <Card key={job.id} style={styles.jobCard}>
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText type="smallBold">{KIND_LABELS[job.kind]} · {job.orderNumber}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">{job.location ?? '—'}</ThemedText>
              </View>
              <Button onPress={() => handleAccept(job.id)} isPending={busyJobId === job.id}>
                Accept
              </Button>
            </Card>
          ))}
        </View>
      )}

      {active.length > 0 && (
        <View style={styles.section}>
          <SectionLabel>Active jobs</SectionLabel>
          <ThemedText themeColor="textSecondary" type="small">Tap a job to select it, then choose a status below.</ThemedText>
          {active.map(job => {
            const selected = selectedIds.has(job.id);
            return (
              <Pressable key={job.id} onPress={() => toggleSelected(job.id)}>
                <Card style={[styles.jobCard, selected && styles.jobCardSelected]}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <ThemedText type="smallBold">{KIND_LABELS[job.kind]} · {job.orderNumber}</ThemedText>
                    <ThemedText type="small">{job.customerName} · {job.customerPhone}</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">{job.location ?? '—'}</ThemedText>
                  </View>
                  <ThemedText type="small" style={{ color: Colors.brand, fontWeight: '600' }}>
                    {job.riderStatus ? RIDER_JOB_STATUS_LABELS[job.riderStatus] : ''}
                  </ThemedText>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}

      {selectedIds.size > 0 && (
        <Card style={styles.section}>
          <SectionLabel>{`Update ${selectedIds.size} selected`}</SectionLabel>
          <View style={styles.chipRow}>
            {NEXT_RIDER_JOB_STATUSES.map(s => (
              <Chip key={s} selected={bulkTarget === s} onPress={() => setBulkTarget(s)}>
                {RIDER_JOB_STATUS_LABELS[s]}
              </Chip>
            ))}
          </View>
          <Button onPress={handleBulkUpdate} isPending={isBulkUpdating} disabled={!bulkTarget}>
            {`Mark ${selectedIds.size} selected`}
          </Button>
        </Card>
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
    gap: 16,
    paddingBottom: 24,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  jobCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  jobCardSelected: {
    borderColor: Colors.brand,
    borderWidth: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
