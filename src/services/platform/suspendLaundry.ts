'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function suspendLaundry(laundryId: string): Promise<ServiceResult<null>> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return { success: false, error: 'Unauthorized.' }

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('laundry_id', laundryId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub) return { success: false, error: 'No active subscription found.' }

  const { error } = await admin.from('subscriptions').update({ status: 'locked' }).eq('id', sub.id)
  if (error) return { success: false, error: error.message }

  await admin.from('activity_logs').insert({
    laundry_id: laundryId,
    platform_admin_id: platformAdminId,
    action_type: ACTIVITY_ACTION_TYPES.LAUNDRY_SUSPENDED,
    description: 'Laundry suspended by Rinsion staff',
  })

  return { success: true, data: null }
}
