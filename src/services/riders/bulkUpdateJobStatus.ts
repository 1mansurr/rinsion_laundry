'use server'

import { createAdminClient } from '@/lib/supabase'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import { RIDER_JOB_STATUSES } from '@/constants/statuses'
import { revalidatePath } from 'next/cache'
import type { RiderJobStatus } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Single job or several at once (e.g. three pickups arriving at the laundry
 * together, all marked "dropped off" in one action) — same service either
 * way, mirrors assignRiderToJob.ts's admin-client + explicit ownership-check
 * pattern since logistics_requests has no rider-tenant write RLS policy.
 */
export async function bulkUpdateJobStatus(jobIds: string[], status: RiderJobStatus): Promise<ServiceResult<null>> {
  const profile = await getMyRiderProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }
  if (jobIds.length === 0) return { success: false, error: 'Select at least one job.' }

  const admin = createAdminClient()

  const { data: jobs } = await admin
    .from('logistics_requests')
    .select('id, accepted_at, rider_status')
    .in('id', jobIds)
    .eq('assigned_rider_id', profile.id)

  if (!jobs || jobs.length !== jobIds.length) {
    return { success: false, error: 'One or more jobs could not be found.' }
  }
  if (jobs.some(j => !j.accepted_at)) {
    return { success: false, error: 'Accept a job before updating its status.' }
  }

  const targetIndex = RIDER_JOB_STATUSES.indexOf(status)
  const goesBackward = jobs.some(j => RIDER_JOB_STATUSES.indexOf(j.rider_status as RiderJobStatus) > targetIndex)
  if (goesBackward) {
    return { success: false, error: 'Cannot move a job backward in status.' }
  }

  const { error } = await admin
    .from('logistics_requests')
    .update({ rider_status: status })
    .in('id', jobIds)
    .eq('assigned_rider_id', profile.id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/rider/jobs')
  return { success: true, data: null }
}
