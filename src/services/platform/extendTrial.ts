'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function extendTrial(laundryId: string, extraDays: number): Promise<ServiceResult<null>> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return { success: false, error: 'Unauthorized.' }
  if (extraDays <= 0) return { success: false, error: 'Extension must be a positive number of days.' }

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, status, cycle_end_date')
    .eq('laundry_id', laundryId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub) return { success: false, error: 'No active subscription found.' }
  if (sub.status !== 'trialing') return { success: false, error: 'This laundry is not on trial.' }

  const newEnd = new Date(sub.cycle_end_date)
  newEnd.setDate(newEnd.getDate() + extraDays)

  const { error } = await admin
    .from('subscriptions')
    .update({ cycle_end_date: newEnd.toISOString().split('T')[0] })
    .eq('id', sub.id)
  if (error) return { success: false, error: error.message }

  await admin.from('activity_logs').insert({
    laundry_id: laundryId,
    platform_admin_id: platformAdminId,
    action_type: ACTIVITY_ACTION_TYPES.TRIAL_UPDATED,
    description: `Trial extended by ${extraDays} day${extraDays === 1 ? '' : 's'}`,
  })

  return { success: true, data: null }
}
