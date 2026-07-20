import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getBranches } from '@/services/employees/getBranches'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { PLANS } from '@/constants/plans'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { BranchesClient } from './BranchesClient'
import type { SubscriptionPlan } from '@/constants/subscriptionStatuses'

export default async function BranchesPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">Settings</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-semibold text-gray-900">Branches</h1>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  const [branches, subscription] = await Promise.all([
    getBranches(),
    getActiveSubscription(profile.laundryId),
  ])

  const plan = (subscription?.plan ?? 'starter') as SubscriptionPlan
  const branchLimit = PLANS[plan as keyof typeof PLANS]?.branchLimit ?? PLANS.starter.branchLimit

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">Settings</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-semibold text-gray-900">Branches</h1>
      </div>

      <BranchesClient
        branches={branches}
        branchLimit={branchLimit}
      />
    </div>
  )
}
