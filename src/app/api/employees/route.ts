import { NextResponse } from 'next/server'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getEmployees, getBranches } from '@/services/employees'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { PLANS } from '@/constants/plans'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'

export async function GET() {
  const profile = await getMyProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ restricted: true })
  }

  const [employees, branches, subscription] = await Promise.all([
    getEmployees(),
    getBranches(),
    getActiveSubscription(profile.laundryId),
  ])

  const plan = (subscription?.plan ?? 'starter') as SubscriptionPlan
  const limit = PLANS[plan as keyof typeof PLANS]?.employeeLimit ?? PLANS.starter.employeeLimit
  const activeCount = employees.filter(e => e.isActive).length

  return NextResponse.json({
    employees,
    branches,
    plan,
    limit,
    activeCount,
    currentEmployeeId: profile.id,
    isMultiBranch: branches.length > 1,
  })
}
