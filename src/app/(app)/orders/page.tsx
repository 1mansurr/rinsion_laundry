import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getOrdersList, type OrderListRow } from '@/services/orders/getOrdersList'
import { StatusBadge } from '@/components/app/StatusBadge'
import { UrlPagination } from '@/components/ui/UrlPagination'
import { OrdersFilterBar } from './OrdersFilterBar'
import { formatDate } from '@/utils/formatDate'
import { formatCurrency } from '@/utils/formatCurrency'

const PER_PAGE = 30

function formatPieces(row: Pick<OrderListRow, 'pieces' | 'kg'>): string {
  if (row.pieces > 0 && row.kg > 0) return `${row.pieces} pcs, ${row.kg} kg`
  if (row.kg > 0) return `${row.kg} kg`
  return `${row.pieces}`
}

interface Props {
  searchParams: { q?: string; status?: string; page?: string }
}

export default async function OrdersPage({ searchParams }: Props) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const q = searchParams.q ?? ''
  const status = searchParams.status ?? ''
  const page = Math.max(1, Number(searchParams.page ?? '1'))

  const { rows, total } = await getOrdersList(profile.laundryId, { q, status, page, perPage: PER_PAGE })

  const totalPages = Math.ceil(total / PER_PAGE)
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const to = Math.min(page * PER_PAGE, total)

  const paginationParams: Record<string, string> = {}
  if (q) paginationParams.q = q
  if (status) paginationParams.status = status

  return (
    <div className="max-w-[1180px] mx-auto px-4 py-4 md:px-7 md:py-7">
      {/* Page header */}
      <div className="flex items-end justify-between mb-1">
        <div>
          <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Orders</h1>
          <p className="text-ui text-warm-800 mt-1">
            {total} order{total !== 1 ? 's' : ''}
            {profile.role === 'admin' ? ' · All branches' : ''}
          </p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-[7px] bg-brand text-[#FAF8F5] text-ui font-semibold px-[15px] py-[10px] rounded-7 hover:bg-brand-hover transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#FAF8F5">
            <path d="M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5Z" />
          </svg>
          New Order
        </Link>
      </div>

      {/* Filter bar */}
      <div className="mt-[18px] mb-[18px]">
        <OrdersFilterBar defaultQ={q} defaultStatus={status} />
      </div>

      {/* Table / empty */}
      {rows.length === 0 ? (
        <div className="bg-white border border-warm-300 rounded-10 py-[58px] px-[30px] flex flex-col items-center text-center">
          <svg viewBox="0 0 120 120" width="78" height="78" className="mb-[18px]">
            <circle cx="60" cy="60" r="48" fill="none" stroke="#E8E4DD" strokeWidth="2" />
            <circle cx="60" cy="60" r="33" fill="none" stroke="#E0DAD0" strokeWidth="2" />
            <circle cx="60" cy="60" r="12" fill="none" stroke="#0F3D2E" strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray="86 14" transform="rotate(-56 60 60)" />
          </svg>
          <p className="text-[19px] font-semibold text-warm-950 mb-1.5">
            {q || status ? 'Nothing to show' : 'No orders yet'}
          </p>
          <p className="text-ui-sm text-warm-800 max-w-[340px] leading-relaxed">
            {q || status
              ? 'No records match your current filters. Try clearing the search or status filter.'
              : 'Create your first order to start managing collections.'}
          </p>
          {!q && !status && (
            <Link href="/orders/new" className="mt-4 inline-flex items-center gap-1.5 bg-brand text-[#FAF8F5] text-ui font-semibold px-4 py-2.5 rounded-7 hover:bg-brand-hover transition-colors">
              New Order
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
            {/* Desktop header row */}
            <div
              className="hidden min-[720px]:grid px-[22px] py-3"
              style={{
                gridTemplateColumns: '0.7fr 1.5fr 0.7fr 1.1fr 0.9fr 0.9fr 1.1fr',
                gap: '14px',
                background: '#F8F5F0',
                fontSize: '11.5px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#8A8175',
              }}
            >
              <span>Order</span>
              <span>Customer</span>
              <span>Qty</span>
              <span>Status</span>
              <span style={{ textAlign: 'right' }}>Total</span>
              <span style={{ textAlign: 'right' }}>Balance</span>
              <span style={{ textAlign: 'right' }}>Created</span>
            </div>

            {rows.map(o => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="block border-b border-[#F4F0EA] last:border-0 hover:bg-warm-50 transition-colors"
              >
                {/* Desktop row */}
                <div
                  className="hidden min-[720px]:grid items-center px-[22px] py-[14px]"
                  style={{ gridTemplateColumns: '0.7fr 1.5fr 0.7fr 1.1fr 0.9fr 0.9fr 1.1fr', gap: '14px' }}
                >
                  <span className="tnum text-ui font-bold text-brand">{o.orderNumber}</span>
                  <div className="flex items-center gap-[11px] min-w-0">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-brand-pale text-brand flex items-center justify-center text-caption font-semibold">
                      {o.customerInitials}
                    </span>
                    <div className="min-w-0">
                      <div className="text-ui-sm font-semibold text-warm-950 truncate">{o.customerName}</div>
                      <div className="text-caption text-warm-600">{o.branchName}</div>
                    </div>
                  </div>
                  <span className="tnum text-ui text-warm-900">{formatPieces(o)}</span>
                  <span><StatusBadge status={o.status as never} /></span>
                  <span className="tnum text-ui font-semibold text-warm-950 text-right">{formatCurrency(o.total)}</span>
                  <span className={`tnum text-ui font-semibold text-right ${o.balance > 0 ? 'text-error' : 'text-warm-600'}`}>
                    {o.balance > 0 ? formatCurrency(o.balance) : 'Paid'}
                  </span>
                  <span className="tnum text-label text-warm-800 text-right">{formatDate(o.createdAt)}</span>
                </div>

                {/* Mobile row */}
                <div className="min-[720px]:hidden px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 shrink-0 rounded-full bg-brand-pale text-brand flex items-center justify-center text-caption font-semibold">
                        {o.customerInitials}
                      </span>
                      <span className="text-ui font-semibold text-warm-950 truncate">{o.customerName}</span>
                    </div>
                    <StatusBadge status={o.status as never} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="tnum text-caption font-bold text-brand">{o.orderNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className="tnum text-caption text-warm-950 font-semibold">{formatCurrency(o.total)}</span>
                      {o.balance > 0 && (
                        <span className="tnum text-caption text-error">({formatCurrency(o.balance)} due)</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-[18px]">
              <span className="text-label text-warm-800">Showing {from}–{to} of {total}</span>
              <UrlPagination
                page={page}
                totalPages={totalPages}
                pathname="/orders"
                searchParams={paginationParams}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
