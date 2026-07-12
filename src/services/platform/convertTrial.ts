'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { PLANS, CYCLE_DAYS } from '@/constants/plans'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function convertTrial(laundryId: string, plan: 'starter' | 'growth'): Promise<ServiceResult<null>> {
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
  if (sub.status !== 'trialing') return { success: false, error: 'This laundry is not on trial.' }

  const today = new Date().toISOString().split('T')[0]
  const cycleEnd = new Date(Date.now() + CYCLE_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { error } = await admin
    .from('subscriptions')
    .update({
      plan,
      status: 'active',
      cycle_start_date: today,
      cycle_end_date: cycleEnd,
      sms_quota: PLANS[plan].smsQuota,
      employee_limit: PLANS[plan].employeeLimit,
    })
    .eq('id', sub.id)
  if (error) return { success: false, error: error.message }

  await admin.from('activity_logs').insert({
    laundry_id: laundryId,
    platform_admin_id: platformAdminId,
    action_type: ACTIVITY_ACTION_TYPES.TRIAL_UPDATED,
    description: `Trial converted to ${plan} plan`,
  })

  return { success: true, data: null }
}
