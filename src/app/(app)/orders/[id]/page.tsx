import { getOrder } from '@/services/orders'
import { formatCurrency } from '@/utils/formatCurrency'
import { OrderActions } from './OrderActions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { OrderStatus } from '@/constants/statuses'

const STATUS_STYLES: Record<string, string> = {
  received: 'bg-gray-100 text-gray-600', confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-yellow-50 text-yellow-700', ready: 'bg-green-50 text-green-700',
  collected: 'bg-gray-50 text-gray-500', cancelled: 'bg-red-50 text-red-500',
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id)
  if (!order) notFound()

  const customer = order.customers as unknown as { id: string; first_name: string; last_name: string; phone: string } | null
  const branch = order.branches as unknown as { name: string } | null

  const orderItems = (order.order_items as unknown as {
    id: string; quantity: number; unit_price: number; total_price: number;
    item_types: { name: string } | null; services: { name: string } | null
  }[]) ?? []

  const payments = (order.payments as {
    id: string; amount: number; payment_method: string; created_at: string
  }[]) ?? []

  const statusHistory = (order.order_status_history as {
    previous_status: string | null; new_status: string; created_at: string
  }[]).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const notes = (order.order_notes as { id: string; note: string; created_at: string }[]) ?? []

  const amountPaid = payments.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{order.order_number}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[order.status] ?? ''}`}>
              {order.status}
            </span>
            {order.priority !== 'normal' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 capitalize">
                {order.priority}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Pickup code: <span className="font-mono font-bold text-gray-900">{order.pickup_code}</span>
            {order.pickup_date && <span className="ml-3">· Pickup by {order.pickup_date}</span>}
          </p>
        </div>
        <Link href="/orders" className="text-sm text-gray-400 hover:text-gray-700">← Orders</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: order details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer</h2>
            {customer && (
              <Link href={`/customers/${customer.id}`} className="group">
                <p className="font-medium text-gray-900 group-hover:underline">
                  {customer.first_name} {customer.last_name}
                </p>
                <p className="text-sm text-gray-500">{customer.phone}</p>
              </Link>
            )}
            {branch && <p className="text-xs text-gray-400 mt-1">Branch: {branch.name}</p>}
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-2 text-xs text-gray-500">Item</th>
                  <th className="text-left px-5 py-2 text-xs text-gray-500">Service</th>
                  <th className="text-center px-3 py-2 text-xs text-gray-500">Qty</th>
                  <th className="text-right px-5 py-2 text-xs text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orderItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-5 py-2.5 text-gray-900">{item.item_types?.name ?? '—'}</td>
                    <td className="px-5 py-2.5 text-gray-600">{item.services?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-5 py-2.5 text-right text-gray-900 font-medium">{formatCurrency(Number(item.total_price))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100">
                  <td colSpan={3} className="px-5 py-2.5 text-sm font-semibold text-gray-900 text-right">Total</td>
                  <td className="px-5 py-2.5 text-right font-bold text-gray-900">{formatCurrency(Number(order.total))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Payment History</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <p className="text-sm text-gray-900 capitalize">{p.payment_method.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-400">{p.created_at.split('T')[0]}</p>
                    </div>
                    <span className="text-sm font-medium text-green-700">{formatCurrency(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {notes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h2>
              {notes.map(n => (
                <p key={n.id} className="text-sm text-gray-700">{n.note}</p>
              ))}
            </div>
          )}

          {/* Status history */}
          {statusHistory.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">History</h2>
              <div className="space-y-2">
                {statusHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                    <span>
                      {h.previous_status ? `${h.previous_status} → ` : ''}<strong className="text-gray-700">{h.new_status}</strong>
                    </span>
                    <span className="text-gray-300 ml-auto">{h.created_at.split('T')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="lg:col-span-1">
          <OrderActions
            orderId={order.id}
            currentStatus={order.status as OrderStatus}
            total={Number(order.total)}
            amountPaid={amountPaid}
          />
        </div>
      </div>
    </div>
  )
}
