'use server'

import { createClient } from '@/lib/supabase'
import { getVerifiedUserId } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { PLANS, TRIAL_DAYS } from '@/constants/plans'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Starts the 14-day trial for a laundry that doesn't have one yet — used by
 * self-serve signups, which deliberately don't get a subscription at
 * creation time (see createLaundrySelfServe). Until this runs, every write
 * action stays blocked by the existing "no active subscription" check.
 */
export async function startTrial(): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id, role')
    .eq('auth_user_id', userId)
    .single()
  if (!emp || emp.role !== 'admin') return { success: false, error: 'Admin only.' }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('laundry_id', emp.laundry_id)
    .neq('status', 'cancelled')
    .maybeSingle()
  if (existing) return { success: false, error: 'A subscription already exists.' }

  const today = new Date().toISOString().split('T')[0]
  const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const { error } = await supabase.from('subscriptions').insert({
    laundry_id: emp.laundry_id,
    plan: 'trial',
    status: 'trialing',
    cycle_start_date: today,
    cycle_end_date: trialEnd,
    sms_quota: PLANS.trial.smsQuota,
  })
  if (error) return { success: false, error: error.message }

  revalidateTag('subscription')
  revalidatePath('/dashboard')
  revalidatePath('/settings/subscription')
  return { success: true, data: null }
}
