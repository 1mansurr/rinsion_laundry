'use server'

import { createAdminClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { getActiveSubscription } from './getActive'
import { generatePaymentReference } from './generatePaymentReference'
import { paystackProvider } from '@/lib/payments'
import { PLANS, CYCLE_DAYS } from '@/constants/plans'
import { ROLES } from '@/constants/statuses'
import type { MobileMoneyProvider } from '@/lib/payments'
import type { ServiceResult } from '@/types/serviceResult'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'

interface InitiateInput {
  paymentType: 'cycle_renewal' | 'trial_conversion'
  targetPlan: SubscriptionPlan
  phone: string
  provider: MobileMoneyProvider
}

interface InitiateResult {
  referenceCode: string
  displayText?: string
}

const IN_FLIGHT_WINDOW_MS = 3 * 60 * 1000 // matches the ~2min polling window with headroom

/**
 * The Paystack-flow twin of claimPaymentSent.ts — pushes a USSD/PIN prompt to
 * the admin's phone instead of waiting on a manual claim. Re-derives
 * amount/cycle dates the same way getSubscriptionPageData.ts does; hidden
 * form fields are untrusted, same reasoning as the manual flow.
 */
export async function initiateSubscriptionPayment(
  input: InitiateInput
): Promise<ServiceResult<InitiateResult>> {
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const emp = check.data

  const subscription = await getActiveSubscription(emp.laundryId)
  if (!subscription) return { success: false, error: 'No active subscription found.' }

  // Growth is not self-serve (see Rinsion_Business_Overview.md → Pricing
  // Model) — same guard as claimPaymentSent.ts.
  if (input.targetPlan === 'growth' && input.paymentType !== 'cycle_renewal') {
    return { success: false, error: 'Growth is not self-serve — contact Rinsion directly.' }
  }

  const planKey = input.targetPlan as keyof typeof PLANS
  const amount = PLANS[planKey]?.price ?? 0
  if (amount <= 0) return { success: false, error: 'Invalid plan.' }

  const admin = createAdminClient()

  // Avoid double-charging on a double-click or a page reload while a charge
  // from moments ago is still awaiting the customer's PIN.
  const { data: inFlight } = await admin
    .from('subscription_payment_links')
    .select('reference_code, display_text, created_at')
    .eq('laundry_id', emp.laundryId)
    .eq('payment_type', input.paymentType)
    .eq('target_plan', input.targetPlan)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (inFlight && Date.now() - new Date(inFlight.created_at).getTime() < IN_FLIGHT_WINDOW_MS) {
    return { success: true, data: { referenceCode: inFlight.reference_code, displayText: inFlight.display_text ?? undefined } }
  }

  const today = new Date()
  const cycleStart = today.toISOString().split('T')[0]
  const cycleEndDate = new Date(today)
  cycleEndDate.setDate(cycleEndDate.getDate() + CYCLE_DAYS)
  const cycleEnd = cycleEndDate.toISOString().split('T')[0]

  // generatePaymentReference() is stable per laundry/day/type by design (the
  // manual flow relies on that for its static instructions) — a Paystack
  // reference must be unique per charge attempt, so a fresh attempt suffix is
  // appended on top of it.
  const reference = `${generatePaymentReference(emp.laundryId, input.paymentType)}-${Date.now().toString(36).toUpperCase()}`

  let chargeResult
  try {
    chargeResult = await paystackProvider.chargeMobileMoney(
      amount,
      reference,
      input.phone,
      input.provider,
      {
        purpose: 'subscription_payment',
        laundryId: emp.laundryId,
        subscriptionId: subscription.id,
        paymentType: input.paymentType,
        targetPlan: input.targetPlan,
      }
    )
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to initiate payment.' }
  }

  const { error: insertErr } = await admin.from('subscription_payment_links').insert({
    laundry_id: emp.laundryId,
    subscription_id: subscription.id,
    reference_code: reference,
    payment_type: input.paymentType,
    target_plan: input.targetPlan,
    amount,
    target_cycle_start_date: cycleStart,
    target_cycle_end_date: cycleEnd,
    channel: 'mobile_money',
    display_text: chargeResult.displayText ?? null,
  })
  if (insertErr) return { success: false, error: insertErr.message }

  return { success: true, data: { referenceCode: reference, displayText: chargeResult.displayText } }
}
