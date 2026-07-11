import { redirect } from 'next/navigation'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getEmployees } from '@/services/employees/getEmployees'
import { getPendingInvites } from '@/services/employees/getPendingInvites'
import { getPendingJoinRequests } from '@/services/laundries/getPendingJoinRequests'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { PLANS } from '@/constants/plans'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { EmployeesClient } from './EmployeesClient'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'

export default async function EmployeesPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-[1180px] mx-auto px-7 py-7">
        <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight mb-[18px]">Team</h1>
        <RestrictedCard />
      </div>
    )
  }

  const [employees, subscription, pendingRequests, pendingInvites] = await Promise.all([
    getEmployees(),
    getActiveSubscription(profile.laundryId),
    getPendingJoinRequests(),
    getPendingInvites(),
  ])

  const plan = (subscription?.plan ?? 'starter') as SubscriptionPlan
  const limit = PLANS[plan as keyof typeof PLANS]?.employeeLimit ?? PLANS.starter.employeeLimit
  const activeCount = employees.filter(e => e.isActive).length

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      <div className="flex items-end justify-between mb-[18px]">
        <div>
          <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Team</h1>
          <p className="text-ui text-warm-800 mt-1">People with access to Rinsion across your branches.</p>
        </div>
        <p className="text-label text-warm-600">{activeCount} of {limit} slots used</p>
      </div>
      <EmployeesClient
        employees={employees}
        activeCount={activeCount}
        employeeLimit={limit}
        pendingRequests={pendingRequests}
        pendingInvites={pendingInvites}
        currentEmployeeId={profile.id}
      />
    </div>
  )
}
