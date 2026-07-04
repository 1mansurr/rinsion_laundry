'use server'

import { createAdminClient, createClient } from '@/lib/supabase'
import { INTERNAL_ADMIN_EMAILS } from '@/constants/internalAdmins'
import { PLANS, TRIAL_DAYS } from '@/constants/plans'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function startTrial(
  laundryId: string
): Promise<ServiceResult<{ subscriptionId: string }>> {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user || !INTERNAL_ADMIN_EMAILS.includes(user.email ?? '')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const admin = createAdminClient()

  // Guard: no active subscription already exists
  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('laundry_id', laundryId)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'This laundry already has an active subscription.' }
  }

  const today = new Date().toISOString().split('T')[0]
  const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const { data: sub, error } = await admin
    .from('subscriptions')
    .insert({
      laundry_id: laundryId,
      plan: 'trial',
      status: 'trialing',
      cycle_start_date: today,
      cycle_end_date: trialEnd,
      sms_quota: PLANS.trial.smsQuota,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  await admin.from('activity_logs').insert({
    laundry_id: laundryId,
    employee_id: null,
    internal_admin_email: user.email,
    action_type: ACTIVITY_ACTION_TYPES.INTERNAL_TRIAL_STARTED,
    description: `Trial started by Rinsion admin ${user.email}`,
  })

  revalidatePath('/internal/laundries')
  return { success: true, data: { subscriptionId: sub.id } }
}
