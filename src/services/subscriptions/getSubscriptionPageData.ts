'use server'

import { createClient } from '@/lib/supabase'
import { getActiveSubscription, type ActiveSubscription } from '@/services/subscriptions/getActive'
import { generatePaymentReference } from '@/services/subscriptions/generatePaymentReference'
import { PLANS } from '@/constants/plans'
import type { SubscriptionPlan, SubscriptionPaymentType } from '@/constants/subscriptionStatuses'

export interface RecentPayment {
  id: string
  amount: number
  payment_type: string
  plan_at_payment: string
  paid_at: string
}

export interface PendingClaim {
  id: string
  reference_code: string
  claimed_amount: number
  target_plan: string
  claimed_at: string
}

export interface SubscriptionPageData {
  subscription: ActiveSubscription | null
  recentPayments: RecentPayment[]
  existingClaim: PendingClaim | null
  action: string | null
  selectedPlan: string | null
  paymentType: SubscriptionPaymentType | null
  targetPlan: SubscriptionPlan | null
  paymentAmount: number | null
  newCycleStart: string | null
  newCycleEnd: string | null
  referenceCode: string | null
  momoNumber: string
}

export async function getSubscriptionPageData(
  laundryId: string,
  action: string | null,
  selectedPlan: string | null
): Promise<SubscriptionPageData> {
  const supabase = createClient()

  const subscription = await getActiveSubscription(laundryId)

  const [{ data: recentPaymentsData }, { data: existingClaim }] = await Promise.all([
    supabase
      .from('subscription_payments')
      .select('id, amount, plan_at_payment, payment_type, cycle_start_date, cycle_end_date, paid_at')
      .eq('laundry_id', laundryId)
      .order('paid_at', { ascending: false })
      .limit(3),
    supabase
      .from('pending_payments')
      .select('id, reference_code, claimed_amount, target_plan, claimed_at')
      .eq('laundry_id', laundryId)
      .is('resolved_at', null)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  let paymentType: SubscriptionPaymentType | null = null
  let targetPlan: SubscriptionPlan | null = null
  let paymentAmount: number | null = null
  let newCycleStart: string | null = null
  let newCycleEnd: string | null = null
  let referenceCode: string | null = null

  // Growth is not self-serve (see Rinsion_Business_Overview.md → Pricing
  // Model) — a laundry moves onto it only after contacting us directly, who
  // then convert them via the internal platform-admin tools
  // (src/services/platform/convertTrial.ts, src/services/admin/resolvePayment.ts).
  // So 'upgrade' (starter → growth) is not handled here at all, and 'convert'
  // only recognises 'starter' as a selectable target plan.
  if (subscription && (action === 'renew' || action === 'convert')) {
    const today = new Date()

    if (action === 'convert' && selectedPlan === 'starter') {
      paymentType = 'trial_conversion'
      targetPlan = selectedPlan as SubscriptionPlan
      paymentAmount = PLANS[selectedPlan as keyof typeof PLANS]?.price ?? null
      newCycleStart = today.toISOString().split('T')[0]
      const end = new Date(today)
      end.setDate(end.getDate() + 30)
      newCycleEnd = end.toISOString().split('T')[0]
      referenceCode = generatePaymentReference(laundryId, 'trial_conversion')
    } else if (action === 'renew') {
      paymentType = 'cycle_renewal'
      targetPlan = subscription.plan === 'trial' ? 'starter' : subscription.plan
      paymentAmount = PLANS[targetPlan as keyof typeof PLANS]?.price ?? null
      newCycleStart = today.toISOString().split('T')[0]
      const end = new Date(today)
      end.setDate(end.getDate() + 30)
      newCycleEnd = end.toISOString().split('T')[0]
      referenceCode = generatePaymentReference(laundryId, 'cycle_renewal')
    }
  }

  return {
    subscription,
    recentPayments: recentPaymentsData ?? [],
    existingClaim,
    action,
    selectedPlan,
    paymentType,
    targetPlan,
    paymentAmount,
    newCycleStart,
    newCycleEnd,
    referenceCode,
    momoNumber: process.env.RINSION_MOMO_NUMBER ?? 'Contact Rinsion for MoMo number',
  }
}
