'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidateTag } from 'next/cache'
import { PLANS, CYCLE_DAYS } from '@/constants/plans'
import type { PlanKey } from '@/constants/plans'

interface RenewalInput {
  laundryId: string
  subscriptionId: string
  plan: PlanKey
  recordedByEmail: string
  externalReference?: string
}

/**
 * Called by the Rinsion internal admin (Phase 11) after verifying a MoMo payment.
 * Creates the subscription_payment record and advances the subscription to active.
 * Uses service-role client — no RLS.
 */
export async function recordCycleRenewalPayment(
  input: RenewalInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()
  const amount = PLANS[input.plan].price

  const today = new Date()
  const cycleStart = today.toISOString().split('T')[0]
  const cycleEndDate = new Date(today)
  cycleEndDate.setDate(cycleEndDate.getDate() + CYCLE_DAYS)
  const cycleEnd = cycleEndDate.toISOString().split('T')[0]

  const { error: payErr } = await supabase.from('subscription_payments').insert({
    subscription_id: input.subscriptionId,
    laundry_id: input.laundryId,
    amount,
    plan_at_payment: input.plan,
    payment_type: 'cycle_renewal',
    payment_method: 'manual_momo',
    external_reference: input.externalReference ?? null,
    cycle_start_date: cycleStart,
    cycle_end_date: cycleEnd,
    recorded_by_employee_id: null,
    paid_at: new Date().toISOString(),
  })
  if (payErr) return { success: false, error: payErr.message }

  const { error: subErr } = await supabase.from('subscriptions').update({
    status: 'active',
    plan: input.plan,
    cycle_start_date: cycleStart,
    cycle_end_date: cycleEnd,
    sms_quota: PLANS[input.plan].smsQuota,
    sms_warning_70_sent_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', input.subscriptionId)
  if (subErr) return { success: false, error: subErr.message }

  await supabase.from('activity_logs').insert({
    laundry_id: input.laundryId,
    action_type: 'SUBSCRIPTION_PAYMENT_RECORDED',
    description: `${input.plan} renewal recorded by ${input.recordedByEmail}. New cycle: ${cycleStart} → ${cycleEnd}`,
  })

  // Un-blocking a laundry must take effect immediately, not after
  // getActiveSubscription()'s 60s cache TTL.
  revalidateTag('subscription')
  return { success: true }
}
