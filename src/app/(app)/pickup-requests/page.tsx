import { redirect } from 'next/navigation'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getSettings } from '@/services/settings/getSettings'
import { getPickupRequests } from '@/services/pickupRequests/getPickupRequests'
import { getPickupRequestsPendingCount } from '@/services/pickupRequests/getPickupRequestsPendingCount'
import { PICKUP_REQUESTS_UI_ENABLED } from '@/constants/featureFlags'
import { OrdersSegmentedNav } from '@/components/app/OrdersSegmentedNav'
import { PickupRequestCard } from './PickupRequestCard'

export default async function PickupRequestsPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  // Defense in depth beyond hiding the nav item — a laundry without this
  // flag on shouldn't be able to reach the page via a direct URL either.
  const settings = await getSettings()
  if (!PICKUP_REQUESTS_UI_ENABLED || !settings?.allowCustomerSubmissions) redirect('/dashboard')

  const [requests, pendingCount] = await Promise.all([
    getPickupRequests(),
    getPickupRequestsPendingCount(),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:p-6">
      <h1 className="text-h1 font-semibold text-warm-950 mb-4">Pickup Requests</h1>
      <OrdersSegmentedNav active="requests" pendingCount={pendingCount} />

      {requests.length === 0 ? (
        <div className="bg-white border border-warm-300 rounded-18 p-6 text-center">
          <p className="text-ui text-warm-600">No pickup requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <PickupRequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  )
}
