import { getMyProfile } from '@/services/employees/getMyProfile'
import { getOrders } from '@/services/orders'
import { formatCurrency } from '@/utils/formatCurrency'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  received: 'bg-gray-100 text-gray-600', confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-yellow-50 text-yellow-700', ready: 'bg-green-50 text-green-700',
  collected: 'bg-gray-50 text-gray-400', cancelled: 'bg-red-50 text-red-400',
}

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const profile = await getMyProfile()
  if (!profile) return null

  const orders = await getOrders(profile.laundryId, searchParams.status as never)

  const FILTERS = ['all', 'received', 'confirmed', 'processing', 'ready', 'collected']

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <Link
          href="/orders/new"
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Order
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <Link
            key={f}
            href={f === 'all' ? '/orders' : `/orders?status=${f}`}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              (f === 'all' && !searchParams.status) || f === searchParams.status
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {f}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-500">No orders found.</p>
            <Link href="/orders/new" className="text-sm text-gray-900 underline mt-2 inline-block">
              Create first order
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Total</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Pickup</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 font-mono text-xs">{o.orderNumber}</p>
                    <p className="text-xs text-gray-400">{o.createdAt.split('T')[0]}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-900">{o.customerName}</p>
                    <p className="text-xs text-gray-400">{o.customerPhone}</p>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[o.status] ?? ''}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-700 hidden sm:table-cell">{formatCurrency(o.total)}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs hidden lg:table-cell">{o.pickupDate ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/orders/${o.id}`} className="text-xs text-gray-400 hover:text-gray-900">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
