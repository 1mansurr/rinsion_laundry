import { getEmployees, getBranches } from '@/services/employees'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { PLANS } from '@/constants/plans'
import { redirect } from 'next/navigation'
import { EmployeesClient } from './EmployeesClient'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'

export default async function EmployeesPage() {
  const profile = await getMyProfile()
  if (!profile) return null
  if (profile.role !== 'admin') redirect('/dashboard')

  const [employees, branches, subscription] = await Promise.all([
    getEmployees(),
    getBranches(),
    getActiveSubscription(profile.laundryId),
  ])

  const plan = (subscription?.plan ?? 'starter') as SubscriptionPlan
  const limit = PLANS[plan as keyof typeof PLANS]?.employeeLimit ?? PLANS.starter.employeeLimit
  const activeCount = employees.filter(e => e.isActive).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeCount} of {limit} slots used · {plan} plan</p>
        </div>
      </div>

      <EmployeesClient
        employees={employees}
        branches={branches}
        activeCount={activeCount}
        employeeLimit={limit}
        currentEmployeeId={profile.id}
      />
    </div>
  )
}
