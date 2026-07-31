'use server'

import { createAdminClient } from '@/lib/supabase'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

// logistics_requests has no RLS write policy for the rider tenant (only the
// rider_company_read SELECT policy) — this write goes through the admin
// client with the ownership check (assigned_rider_id = me) done explicitly,
// same pattern as assignRiderToJob.ts.
export async function acceptJob(jobId: string): Promise<ServiceResult<null>> {
  const profile = await getMyRiderProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const admin = createAdminClient()

  const { data: job } = await admin
    .from('logistics_requests')
    .select('id, accepted_at')
    .eq('id', jobId)
    .eq('assigned_rider_id', profile.id)
    .maybeSingle()
  if (!job) return { success: false, error: 'Job not found.' }
  if (job.accepted_at) return { success: false, error: 'This job has already been accepted.' }

  const { error } = await admin
    .from('logistics_requests')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/rider/jobs')
  return { success: true, data: null }
}
