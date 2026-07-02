import { NextResponse } from 'next/server'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { computeProrateAmount } from '@/services/subscriptions/computeProrateAmount'
import { generatePaymentReference } from '@/services/subscriptions/generatePaymentReference'
import { PLANS } from '@/constants/plans'
import { createClient } from '@/lib/supabase'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'
import type { SubscriptionPaymentType } from '@/constants/subscriptionStatuses'

export async function GET(request: Request) {
  const profile = await getMyProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient()

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') ?? null
  const selectedPlan = searchParams.get('plan') as SubscriptionPlan | null

  const subscription = await getActiveSubscription(profile.laundryId)

  const [{ data: recentPaymentsData }, { data: existingClaim }] = await Promise.all([
    supabase
      .from('subscription_payments')
      .select('id, amount, plan_at_payment, payment_type, cycle_start_date, cycle_end_date, paid_at')
      .eq('laundry_id', profile.laundryId)
      .order('paid_at', { ascending: false })
      .limit(3),
    supabase
      .from('pending_payments')
      .select('id, reference_code, claimed_amount, target_plan, claimed_at')
      .eq('laundry_id', profile.laundryId)
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

  if (subscription && (action === 'renew' || action === 'upgrade' || action === 'convert')) {
    const today = new Date()

    if (action === 'convert' && selectedPlan) {
      paymentType = 'trial_conversion'
      targetPlan = selectedPlan
      paymentAmount = PLANS[selectedPlan as keyof typeof PLANS]?.price ?? null
      newCycleStart = today.toISOString().split('T')[0]
      const end = new Date(today)
      end.setDate(end.getDate() + 30)
      newCycleEnd = end.toISOString().split('T')[0]
      referenceCode = generatePaymentReference(profile.laundryId, 'trial_conversion')
    } else if (action === 'upgrade' && subscription.plan === 'starter') {
      paymentType = 'upgrade_prorate'
      targetPlan = 'growth'
      paymentAmount = computeProrateAmount(subscription.daysLeft)
      newCycleStart = subscription.cycleStartDate
      newCycleEnd = subscription.cycleEndDate
      referenceCode = generatePaymentReference(profile.laundryId, 'upgrade_prorate')
    } else if (action === 'renew') {
      paymentType = 'cycle_renewal'
      targetPlan = subscription.plan === 'trial' ? 'starter' : subscription.plan
      paymentAmount = PLANS[targetPlan as keyof typeof PLANS]?.price ?? null
      newCycleStart = today.toISOString().split('T')[0]
      const end = new Date(today)
      end.setDate(end.getDate() + 30)
      newCycleEnd = end.toISOString().split('T')[0]
      referenceCode = generatePaymentReference(profile.laundryId, 'cycle_renewal')
    }
  }

  return NextResponse.json({
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
  })
}
