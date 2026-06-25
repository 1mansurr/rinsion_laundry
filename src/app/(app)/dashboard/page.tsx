import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { formatCurrency } from '@/utils/formatCurrency'
import Link from 'next/link'

export default async function DashboardPage() {
  const profile = await getMyProfile()
  if (!profile) return null

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: todayOrders },
    { count: readyOrders },
    { count: processingOrders },
    { data: todayPaymentsData },
    subscription,
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .gte('created_at', `${today}T00:00:00`)
      .is('deleted_at', null),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .eq('status', 'ready')
      .is('deleted_at', null),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .eq('status', 'processing')
      .is('deleted_at', null),
    supabase.from('payments')
      .select('amount, orders!inner(laundry_id)')
      .eq('orders.laundry_id', profile.laundryId)
      .gte('created_at', `${today}T00:00:00`),
    getActiveSubscription(profile.laundryId),
  ])

  const todayRevenue = (todayPaymentsData ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, created_at, customers(first_name, last_name)')
    .eq('laundry_id', profile.laundryId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Good {getGreeting()}, {profile.firstName}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{profile.laundryName}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Today's Orders" value={todayOrders ?? 0} />
        <StatCard label="Ready for Pickup" value={readyOrders ?? 0} accent />
        <StatCard label="Processing" value={processingOrders ?? 0} />
        <StatCard label="Today's Revenue" value={formatCurrency(todayRevenue)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-gray-400 hover:text-gray-700">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentOrders ?? []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No orders yet.</p>
            )}
            {(recentOrders ?? []).map((order) => {
              const customer = order.customers as unknown as { first_name: string; last_name: string } | null
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-500">
                      {customer ? `${customer.first_name} ${customer.last_name}` : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(Number(order.total))}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Quick actions + subscription */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/orders/new" className="block w-full text-center bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-800 transition-colors">
                + New Order
              </Link>
              <Link href="/customers/new" className="block w-full text-center border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors">
                + New Customer
              </Link>
            </div>
          </div>

          {subscription && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Subscription</h2>
              <p className="text-xs text-gray-500 capitalize">{subscription.plan} plan · {subscription.status}</p>
              <p className="text-xs text-gray-500 mt-0.5">{subscription.daysLeft} days remaining</p>
              <div className="mt-2 bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-gray-900 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (subscription.daysLeft / 14) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-200'}`}>
      <p className={`text-xs font-medium ${accent ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    received:   'bg-gray-100 text-gray-600',
    confirmed:  'bg-blue-50 text-blue-700',
    processing: 'bg-yellow-50 text-yellow-700',
    ready:      'bg-green-50 text-green-700',
    collected:  'bg-gray-50 text-gray-400',
    cancelled:  'bg-red-50 text-red-400',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
