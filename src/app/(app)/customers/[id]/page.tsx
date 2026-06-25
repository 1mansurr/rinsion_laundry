import { getCustomer } from '@/services/customers'
import { formatCurrency } from '@/utils/formatCurrency'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await getCustomer(params.id)
  if (!customer) notFound()

  const orders = (customer.orders as {
    id: string; order_number: string; status: string; total: number; created_at: string; pickup_date: string | null
  }[]) ?? []

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total), 0)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {customer.first_name} {customer.last_name}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{customer.phone}</p>
          <p className="text-xs text-gray-400 font-mono mt-1">{customer.customer_code}</p>
        </div>
        <Link
          href={`/orders/new?customerId=${customer.id}`}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Order
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Lifetime Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Last Visit</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{customer.last_visit_date ?? '—'}</p>
        </div>
      </div>

      {/* Order history */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Order History</h2>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No orders yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                  <p className="text-xs text-gray-400">{order.created_at.split('T')[0]}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={order.status} />
                  <p className="text-xs text-gray-500 mt-1">{formatCurrency(Number(order.total))}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    received: 'bg-gray-100 text-gray-600', confirmed: 'bg-blue-50 text-blue-700',
    processing: 'bg-yellow-50 text-yellow-700', ready: 'bg-green-50 text-green-700',
    collected: 'bg-gray-50 text-gray-400', cancelled: 'bg-red-50 text-red-400',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? ''}`}>
      {status}
    </span>
  )
}
