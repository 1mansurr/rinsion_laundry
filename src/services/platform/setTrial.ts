'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { PLANS, TRIAL_DAYS } from '@/constants/plans'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

/** Fallback path for a laundry with no subscription row at all (provisionLaundry always creates one). */
export async function setTrial(laundryId: string): Promise<ServiceResult<null>> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return { success: false, error: 'Unauthorized.' }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('laundry_id', laundryId)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (existing) return { success: false, error: 'This laundry already has an active subscription.' }

  const today = new Date().toISOString().split('T')[0]
  const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { error } = await admin.from('subscriptions').insert({
    laundry_id: laundryId,
    plan: 'trial',
    status: 'trialing',
    cycle_start_date: today,
    cycle_end_date: trialEnd,
    sms_quota: PLANS.trial.smsQuota,
    employee_limit: PLANS.trial.employeeLimit,
  })
  if (error) return { success: false, error: error.message }

  await admin.from('activity_logs').insert({
    laundry_id: laundryId,
    platform_admin_id: platformAdminId,
    action_type: ACTIVITY_ACTION_TYPES.TRIAL_UPDATED,
    description: 'Trial started by Rinsion staff',
  })

  return { success: true, data: null }
}
