'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from './getActive'
import { PLANS, CYCLE_DAYS } from '@/constants/plans'
import { computeProrateAmount } from './computeProrateAmount'

/**
 * Server action: called when the admin clicks "I have sent the payment".
 * Inserts into pending_payments (the internal Manual Payments Queue) and
 * logs the claim in activity_logs.
 * Re-derives all amounts server-side — hidden form fields are untrusted.
 */
export async function claimPaymentSent(formData: FormData): Promise<void> {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const subscription = await getActiveSubscription(profile.laundryId)
  if (!subscription) redirect('/dashboard')

  const referenceCode = (formData.get('reference_code') as string | null) ?? ''
  const paymentType = formData.get('payment_type') as string
  const targetPlan = formData.get('target_plan') as string

  if (!referenceCode || !paymentType || !targetPlan) redirect('/settings/subscription')

  let claimedAmount: number
  let targetCycleStart: string
  let targetCycleEnd: string

  const today = new Date()

  if (paymentType === 'cycle_renewal' || paymentType === 'trial_conversion') {
    const planKey = targetPlan as keyof typeof PLANS
    claimedAmount = PLANS[planKey]?.price ?? 0
    targetCycleStart = today.toISOString().split('T')[0]
    const end = new Date(today)
    end.setDate(end.getDate() + CYCLE_DAYS)
    targetCycleEnd = end.toISOString().split('T')[0]
  } else if (paymentType === 'upgrade_prorate') {
    claimedAmount = computeProrateAmount(subscription.daysLeft)
    targetCycleStart = subscription.cycleStartDate
    targetCycleEnd = subscription.cycleEndDate
  } else {
    redirect('/settings/subscription')
  }

  const supabase = createClient()

  await supabase.from('pending_payments').insert({
    laundry_id: profile.laundryId,
    subscription_id: subscription.id,
    reference_code: referenceCode,
    claimed_amount: claimedAmount,
    target_plan: targetPlan,
    payment_type: paymentType,
    target_cycle_start_date: targetCycleStart,
    target_cycle_end_date: targetCycleEnd,
  })

  await supabase.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    action_type: 'SUBSCRIPTION_PAYMENT_RECORDED',
    description: `Payment claim submitted by ${profile.firstName} ${profile.lastName}. Plan: ${targetPlan}, Type: ${paymentType}, Ref: ${referenceCode}, Amount: GHS ${claimedAmount}`,
  })

  redirect('/settings/subscription?action=claimed')
}
