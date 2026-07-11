'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Always reactivates to 'active' — the prior status (e.g. was this laundry
 * mid-trial when suspended?) isn't recorded anywhere, so this is a
 * deliberate simplification for v1's minimal lifecycle surface.
 */
export async function reactivateLaundry(laundryId: string): Promise<ServiceResult<null>> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return { success: false, error: 'Unauthorized.' }

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, status')
    .eq('laundry_id', laundryId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub) return { success: false, error: 'No active subscription found.' }
  if (sub.status !== 'locked') return { success: false, error: 'This laundry is not suspended.' }

  const { error } = await admin.from('subscriptions').update({ status: 'active' }).eq('id', sub.id)
  if (error) return { success: false, error: error.message }

  await admin.from('activity_logs').insert({
    laundry_id: laundryId,
    platform_admin_id: platformAdminId,
    action_type: ACTIVITY_ACTION_TYPES.LAUNDRY_REACTIVATED,
    description: 'Laundry reactivated by Rinsion staff',
  })

  return { success: true, data: null }
}
