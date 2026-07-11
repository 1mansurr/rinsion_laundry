import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getCustomer } from '@/services/customers/getCustomer'
import { StatusBadge } from '@/components/app/StatusBadge'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'

interface Props {
  params: { id: string }
}

export default async function CustomerDetailPage({ params }: Props) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const data = await getCustomer(params.id)
  if (!data) notFound()

  const orders = (data.orders as {
    id: string; order_number: string; status: string; total: number; created_at: string
  }[]) ?? []
  const nonCancelledOrders = orders.filter(o => o.status !== 'cancelled')
  const totalSpent = nonCancelledOrders.reduce((s, o) => s + Number(o.total), 0)
  const initials = `${data.first_name[0] ?? ''}${data.last_name[0] ?? ''}`.toUpperCase()
  const memberSince = formatDate(data.first_visit_date ?? data.created_at)

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      {/* Back link */}
      <Link href="/customers" className="text-label text-warm-800 hover:text-warm-950 transition-colors">
        ← Customers
      </Link>

      {/* Customer header card */}
      <div className="bg-white border border-warm-300 rounded-10 px-[26px] py-6 mt-2 mb-4 flex items-center gap-5 flex-wrap">
        <span className="w-16 h-16 shrink-0 rounded-full bg-brand text-[#FAF8F5] flex items-center justify-center text-[22px] font-semibold">
          {initials}
        </span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-[25px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">
            {data.first_name} {data.last_name}
          </h1>
          <p className="tnum text-ui text-warm-800 mt-1">
            {data.phone} · Customer since {memberSince}
          </p>
        </div>
        <div className="flex gap-[9px]">
          <Link
            href={`/orders/new?customerId=${data.id}`}
            className="inline-flex items-center gap-[7px] bg-brand text-[#FAF8F5] text-ui font-semibold px-[15px] py-[10px] rounded-7 hover:bg-brand-hover transition-colors"
          >
            New order
          </Link>
          <Link
            href={`/customers/${data.id}/edit`}
            className="inline-flex items-center bg-white text-warm-950 border border-warm-400 text-ui font-semibold px-[15px] py-[10px] rounded-7 hover:bg-warm-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-warm-300 rounded-10 px-5 py-[18px]">
          <p className="text-label text-warm-800 font-medium">Total orders</p>
          <p className="tnum text-[28px] font-bold text-warm-950 mt-1.5">{nonCancelledOrders.length}</p>
        </div>
        <div className="bg-white border border-warm-300 rounded-10 px-5 py-[18px]">
          <p className="text-label text-warm-800 font-medium">Total spent</p>
          <p className="tnum text-[28px] font-bold text-warm-950 mt-1.5">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-white border border-warm-300 rounded-10 px-5 py-[18px]">
          <p className="text-label text-warm-800 font-medium">Last order</p>
          <p className="text-[20px] font-bold text-warm-950 mt-1.5">
            {data.last_visit_date ? formatDate(data.last_visit_date) : '—'}
          </p>
        </div>
      </div>

      {/* Two-column: order history + contact */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
        {/* Order history */}
        <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
          <div className="px-5 py-4 border-b border-warm-200">
            <h2 className="text-h2 font-semibold text-warm-950">Order history</h2>
          </div>
          {/* Desktop column headers */}
          <div
            className="hidden min-[720px]:grid px-5 py-2.5 border-b border-warm-100"
            style={{
              gridTemplateColumns: '0.7fr 0.7fr 1.1fr 0.9fr 1fr',
              gap: '12px',
              background: '#F8F5F0',
              fontSize: '11.5px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#8A8175',
            }}
          >
            <span>Order</span>
            <span>Pieces</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Total</span>
            <span style={{ textAlign: 'right' }}>Date</span>
          </div>
          {orders.length === 0 ? (
            <p className="text-ui text-warm-600 text-center py-10">No orders yet.</p>
          ) : (
            <div>
              {orders.map(order => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block border-b border-[#F4F0EA] last:border-0 hover:bg-warm-50 transition-colors"
                >
                  {/* Desktop */}
                  <div
                    className="hidden min-[720px]:grid items-center px-5 py-[13px]"
                    style={{ gridTemplateColumns: '0.7fr 0.7fr 1.1fr 0.9fr 1fr', gap: '12px' }}
                  >
                    <span className="tnum text-ui font-bold text-brand">{order.order_number}</span>
                    <span className="tnum text-label text-warm-900">—</span>
                    <span><StatusBadge status={order.status as never} /></span>
                    <span className="tnum text-ui font-semibold text-right">{formatCurrency(Number(order.total))}</span>
                    <span className="tnum text-label text-warm-800 text-right">{formatDate(order.created_at)}</span>
                  </div>
                  {/* Mobile */}
                  <div className="min-[720px]:hidden flex items-center justify-between px-5 py-3.5 gap-3">
                    <div>
                      <p className="text-ui font-semibold text-brand">{order.order_number}</p>
                      <p className="text-caption text-warm-600">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={order.status as never} />
                      <p className="text-caption text-warm-800 mt-1">{formatCurrency(Number(order.total))}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: contact info */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-warm-300 rounded-10 px-[22px] py-5">
            <h3 className="text-h2 font-semibold text-warm-950 mb-3.5">Contact</h3>
            <p className="text-micro font-semibold text-warm-600 uppercase tracking-[0.06em] mb-1">Phone</p>
            <p className="tnum text-ui-sm text-warm-950 mb-3.5">{data.phone}</p>
            <p className="text-micro font-semibold text-warm-600 uppercase tracking-[0.06em] mb-1">SMS notifications</p>
            <p className="text-ui-sm font-semibold text-success">Enabled</p>
          </div>
        </div>
      </div>
    </div>
  )
}
