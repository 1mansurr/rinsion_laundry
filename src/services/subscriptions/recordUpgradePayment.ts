'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidateTag } from 'next/cache'
import { PLANS } from '@/constants/plans'
import { computeProrateAmount } from './computeProrateAmount'

interface UpgradeInput {
  laundryId: string
  subscriptionId: string
  cycleStartDate: string
  cycleEndDate: string
  daysRemaining: number
  recordedByEmail: string
  externalReference?: string
}

/**
 * Called by the Rinsion internal admin (Phase 11) after verifying a MoMo upgrade payment.
 * Records prorate payment and upgrades plan to Growth immediately.
 * Cycle dates are preserved; SMS quota increases.
 * Uses service-role client — no RLS.
 */
export async function recordUpgradePayment(
  input: UpgradeInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()
  const amount = computeProrateAmount(input.daysRemaining)

  const { error: payErr } = await supabase.from('subscription_payments').insert({
    subscription_id: input.subscriptionId,
    laundry_id: input.laundryId,
    amount,
    plan_at_payment: 'growth',
    payment_type: 'upgrade_prorate',
    payment_method: 'manual_momo',
    external_reference: input.externalReference ?? null,
    cycle_start_date: input.cycleStartDate,
    cycle_end_date: input.cycleEndDate,
    recorded_by_employee_id: null,
    paid_at: new Date().toISOString(),
  })
  if (payErr) return { success: false, error: payErr.message }

  const { error: subErr } = await supabase.from('subscriptions').update({
    plan: 'growth',
    sms_quota: PLANS.growth.smsQuota,
    employee_limit: PLANS.growth.employeeLimit,
    updated_at: new Date().toISOString(),
  }).eq('id', input.subscriptionId)
  if (subErr) return { success: false, error: subErr.message }

  await supabase.from('activity_logs').insert({
    laundry_id: input.laundryId,
    action_type: 'SUBSCRIPTION_UPGRADED',
    description: `Upgraded to Growth by ${input.recordedByEmail}. Prorate: GHS ${amount}. Cycle unchanged: ${input.cycleStartDate} → ${input.cycleEndDate}`,
  })

  // The new plan/quota must take effect immediately, not after
  // getActiveSubscription()'s 60s cache TTL.
  revalidateTag('subscription')
  return { success: true }
}
