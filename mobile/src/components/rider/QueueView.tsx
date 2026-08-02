import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RIDER_JOB_STATUS_LABELS } from '@/constants/statuses';
import { apiGet, apiPost } from '@/lib/api';
import type { AssignableRider, RiderCompanyJob } from '@/types/riderJobs';

const KIND_LABELS: Record<RiderCompanyJob['kind'], string> = { pickup: 'Pickup', delivery: 'Delivery' };

export function QueueView() {
  const [jobs, setJobs] = useState<RiderCompanyJob[]>([]);
  const [riders, setRiders] = useState<AssignableRider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickedRiderId, setPickedRiderId] = useState<Record<string, string>>({});
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ jobs: RiderCompanyJob[]; riders: AssignableRider[] }>('/api/mobile/rider/queue');
      setJobs(data.jobs);
      setRiders(data.riders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the job queue.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAssign(jobId: string) {
    const riderId = pickedRiderId[jobId];
    if (!riderId) return;
    setError(null);
    setAssigningJobId(jobId);
    try {
      await apiPost('/api/mobile/rider/queue', { jobId, riderId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign job.');
    } finally {
      setAssigningJobId(null);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
    >
      {error && <ErrorBanner message={error} />}

      {!isLoading && jobs.length === 0 && (
        <ThemedText themeColor="textSecondary">No pickups or deliveries waiting right now.</ThemedText>
      )}

      {jobs.map(job => (
        <Card key={job.id} style={styles.jobCard}>
          <ThemedText type="smallBold">{KIND_LABELS[job.kind]} · {job.orderNumber}</ThemedText>
          <ThemedText type="small">{job.customerName} · {job.customerPhone}</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">{job.location ?? '—'}</ThemedText>

          {job.assignedRiderId ? (
            <ThemedText type="small" style={{ fontWeight: '600' }}>
              Assigned to {job.assignedRiderName} · {job.riderStatus ? RIDER_JOB_STATUS_LABELS[job.riderStatus] : 'Unassigned'}
            </ThemedText>
          ) : riders.length === 0 ? (
            <ThemedText themeColor="textSecondary" type="small">No active riders to assign.</ThemedText>
          ) : (
            <View style={{ gap: 8 }}>
              <View style={styles.chipRow}>
                {riders.map(r => (
                  <Chip
                    key={r.id}
                    selected={pickedRiderId[job.id] === r.id}
                    onPress={() => setPickedRiderId(prev => ({ ...prev, [job.id]: r.id }))}
                  >
                    {`${r.firstName} ${r.lastName}`.trim()}
                  </Chip>
                ))}
              </View>
              <Button
                onPress={() => handleAssign(job.id)}
                isPending={assigningJobId === job.id}
                disabled={!pickedRiderId[job.id]}
              >
                Assign
              </Button>
            </View>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingBottom: 24,
  },
  jobCard: {
    gap: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
