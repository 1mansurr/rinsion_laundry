import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { generatePaymentReference } from '@/services/subscriptions/generatePaymentReference'
import { computeProrateAmount } from '@/services/subscriptions/computeProrateAmount'
import { PLANS, CYCLE_DAYS, TRIAL_DAYS } from '@/constants/plans'
import { ROLES } from '@/constants/statuses'
import type { SubscriptionPlan, SubscriptionPaymentType } from '@/constants/subscriptionStatuses'

/**
 * Mirrors services/subscriptions/getSubscriptionPageData.ts via the admin
 * client. `action`/`selectedPlan` query params preview what a renew/convert
 * claim would look like, same as the website's query-string-driven page.
 */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const action = searchParams.get('action')
  const selectedPlan = searchParams.get('selectedPlan')

  const admin = createAdminClient()
  const subscription = await getActiveSubscription(profile.laundryId)

  const [{ data: recentPayments }, { data: existingClaim }] = await Promise.all([
    admin
      .from('subscription_payments')
      .select('id, amount, plan_at_payment, payment_type, cycle_start_date, cycle_end_date, paid_at')
      .eq('laundry_id', profile.laundryId)
      .order('paid_at', { ascending: false })
      .limit(3),
    admin
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

  // Growth is not self-serve (only via internal platform-admin tools) —
  // 'upgrade' (starter -> growth) isn't handled here, and 'convert' only
  // recognizes 'starter', same as getSubscriptionPageData.ts.
  if (subscription && (action === 'renew' || action === 'convert')) {
    const today = new Date()
    if (action === 'convert' && selectedPlan === 'starter') {
      paymentType = 'trial_conversion'
      targetPlan = 'starter'
      paymentAmount = PLANS.starter?.price ?? null
      newCycleStart = today.toISOString().split('T')[0]
      const end = new Date(today)
      end.setDate(end.getDate() + 30)
      newCycleEnd = end.toISOString().split('T')[0]
      referenceCode = generatePaymentReference(profile.laundryId, 'trial_conversion')
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
    recentPayments: recentPayments ?? [],
    existingClaim,
    paymentType,
    targetPlan,
    paymentAmount,
    newCycleStart,
    newCycleEnd,
    referenceCode,
    momoNumber: process.env.RINSION_MOMO_NUMBER ?? 'Contact Rinsion for MoMo number',
  })
}

interface Body {
  action?: 'startTrial' | 'claim'
  referenceCode?: string
  paymentType?: 'cycle_renewal' | 'trial_conversion' | 'upgrade_prorate'
  targetPlan?: string
}

/** Mirrors services/subscriptions/startTrial.ts and claimPaymentSent.ts (JSON, not the redirect-based form action), via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null) as Body | null
  const admin = createAdminClient()

  if (body?.action === 'startTrial') {
    const { data: existing } = await admin
      .from('subscriptions')
      .select('id')
      .eq('laundry_id', profile.laundryId)
      .neq('status', 'cancelled')
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'A subscription already exists.' }, { status: 409 })

    const today = new Date().toISOString().split('T')[0]
    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { error } = await admin.from('subscriptions').insert({
      laundry_id: profile.laundryId,
      plan: 'trial',
      status: 'trialing',
      cycle_start_date: today,
      cycle_end_date: trialEnd,
      sms_quota: PLANS.trial.smsQuota,
      employee_limit: PLANS.trial.employeeLimit,
    })
    if (error) return NextResponse.json({ error: 'Failed to start trial.' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body?.action === 'claim') {
    const { referenceCode, paymentType, targetPlan } = body
    if (!referenceCode || !paymentType || !targetPlan) {
      return NextResponse.json({ error: 'referenceCode, paymentType, and targetPlan are required.' }, { status: 400 })
    }
    if (targetPlan === 'growth' && paymentType !== 'cycle_renewal') {
      return NextResponse.json({ error: 'Growth is not self-serve — contact Rinsion directly.' }, { status: 400 })
    }

    const subscription = await getActiveSubscription(profile.laundryId)
    if (!subscription) return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 })

    let claimedAmount: number
    let targetCycleStart: string
    let targetCycleEnd: string
    const today = new Date()

    if (paymentType === 'cycle_renewal' || paymentType === 'trial_conversion') {
      claimedAmount = PLANS[targetPlan as keyof typeof PLANS]?.price ?? 0
      targetCycleStart = today.toISOString().split('T')[0]
      const end = new Date(today)
      end.setDate(end.getDate() + CYCLE_DAYS)
      targetCycleEnd = end.toISOString().split('T')[0]
    } else if (paymentType === 'upgrade_prorate') {
      claimedAmount = computeProrateAmount(subscription.daysLeft)
      targetCycleStart = subscription.cycleStartDate
      targetCycleEnd = subscription.cycleEndDate
    } else {
      return NextResponse.json({ error: 'Invalid paymentType.' }, { status: 400 })
    }

    await admin.from('pending_payments').insert({
      laundry_id: profile.laundryId,
      subscription_id: subscription.id,
      reference_code: referenceCode,
      claimed_amount: claimedAmount,
      target_plan: targetPlan,
      payment_type: paymentType,
      target_cycle_start_date: targetCycleStart,
      target_cycle_end_date: targetCycleEnd,
    })

    await admin.from('activity_logs').insert({
      laundry_id: profile.laundryId,
      employee_id: profile.employeeId,
      action_type: 'SUBSCRIPTION_PAYMENT_RECORDED',
      description: `Payment claim submitted. Plan: ${targetPlan}, Type: ${paymentType}, Ref: ${referenceCode}, Amount: GHS ${claimedAmount}`,
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'action must be "startTrial" or "claim".' }, { status: 400 })
}
