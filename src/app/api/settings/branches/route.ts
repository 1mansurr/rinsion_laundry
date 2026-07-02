import { NextResponse } from 'next/server'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getBranches } from '@/services/employees'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { PLANS } from '@/constants/plans'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'

export async function GET() {
  const profile = await getMyProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [branches, subscription] = await Promise.all([
    getBranches(),
    getActiveSubscription(profile.laundryId),
  ])

  const plan = (subscription?.plan ?? 'starter') as SubscriptionPlan
  const branchLimit = PLANS[plan as keyof typeof PLANS]?.branchLimit ?? PLANS.starter.branchLimit

  return NextResponse.json({ branches, plan, branchLimit })
}
