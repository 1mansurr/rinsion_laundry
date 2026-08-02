'use server'

import { createAdminClient } from '@/lib/supabase'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import { requireRiderRole } from '@/lib/auth'
import { RIDER_ROLE } from '@/constants/statuses'
import { sendExpoPush } from '@/lib/push/sendExpoPush'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

// logistics_requests has no RLS write policy for the rider tenant (only the
// rider_company_read SELECT policy from the schema migration) — writes here
// go through the admin client with the rider_company_id ownership check done
// explicitly below, same pattern as createRiderInvite.ts/acceptRiderInvite.ts.
export async function assignRiderToJob(jobId: string, riderId: string): Promise<ServiceResult<null>> {
  const profile = await getMyRiderProfile()
  const check = requireRiderRole(profile, RIDER_ROLE.ADMIN)
  if (!check.success) return check
  const caller = check.data

  const admin = createAdminClient()

  const { data: job } = await admin
    .from('logistics_requests')
    .select('id, rider_company_id, assigned_rider_id')
    .eq('id', jobId)
    .eq('rider_company_id', caller.riderCompanyId)
    .maybeSingle()
  if (!job) return { success: false, error: 'Job not found.' }
  if (job.assigned_rider_id) return { success: false, error: 'This job is already assigned.' }

  const { data: rider } = await admin
    .from('riders')
    .select('id, expo_push_token')
    .eq('id', riderId)
    .eq('rider_company_id', caller.riderCompanyId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (!rider) return { success: false, error: 'Rider not found.' }

  const { error } = await admin
    .from('logistics_requests')
    .update({ assigned_rider_id: riderId, rider_status: 'assigned' })
    .eq('id', jobId)
  if (error) return { success: false, error: error.message }

  await admin.from('rider_notifications').insert({
    rider_id: riderId,
    logistics_request_id: jobId,
    message: 'New job assigned to you.',
  })

  // Real OS-level push alongside the in-app notification above — the
  // in-app one still lands even if the phone has no token registered yet
  // (e.g. permission not granted), so this is additive, not a replacement.
  if (rider.expo_push_token) {
    void sendExpoPush(rider.expo_push_token, 'New job assigned', 'Open the app to view and accept it.')
  }

  revalidatePath('/rider/queue')
  return { success: true, data: null }
}
