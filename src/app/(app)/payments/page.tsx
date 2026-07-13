import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getPayments, getPaymentsSummary } from '@/services/payments/getPayments'
import { UrlPagination } from '@/components/ui/UrlPagination'
import { PaymentsFilterBar } from './PaymentsFilterBar'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'

const PER_PAGE = 30

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  momo: 'MoMo',
  card: 'Card',
  bank_transfer: 'Bank transfer',
  other: 'Other',
}

const METHOD_PILL: Record<string, React.CSSProperties> = {
  momo:          { background: '#F7EFD9', color: '#7A5512' },
  card:          { background: '#E4ECF3', color: '#234F70' },
  bank_transfer: { background: '#E4ECF3', color: '#234F70' },
}
const METHOD_PILL_DEFAULT: React.CSSProperties = { background: '#EEEAE3', color: '#5A5249' }

function MethodPill({ method }: { method: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: '12.5px', fontWeight: 600,
      padding: '3px 10px', borderRadius: '999px',
      ...(METHOD_PILL[method] ?? METHOD_PILL_DEFAULT),
    }}>
      {METHOD_LABELS[method] ?? method}
    </span>
  )
}

interface Props {
  searchParams: { q?: string; method?: string; page?: string }
}

export default async function PaymentsPage({ searchParams }: Props) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const q = searchParams.q ?? ''
  const method = searchParams.method ?? ''
  const page = Math.max(1, Number(searchParams.page ?? '1'))

  const [{ rows, total }, summary] = await Promise.all([
    getPayments(profile.laundryId, { q, method, page, perPage: PER_PAGE }),
    getPaymentsSummary(profile.laundryId),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const to = Math.min(page * PER_PAGE, total)

  const paginationParams: Record<string, string> = {}
  if (q) paginationParams.q = q
  if (method) paginationParams.method = method

  return (
    <div className="max-w-[1180px] mx-auto px-4 py-4 md:px-7 md:py-7">
      {/* Header */}
      <div className="flex items-end justify-between mb-1">
        <div>
          <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Payments</h1>
          <p className="text-ui text-warm-800 mt-1">
            {profile.role === 'admin' ? 'All branches' : 'Your branch'}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-[18px] mb-[18px]">
        <div className="bg-white border border-warm-300 rounded-10 px-5 py-[18px]">
          <p className="text-label text-warm-800 font-medium">Collected today</p>
          <p className="tnum text-[26px] font-bold text-warm-950 mt-1.5">{formatCurrency(summary.collectedToday)}</p>
        </div>
        <div className="bg-white border border-warm-300 rounded-10 px-5 py-[18px]">
          <p className="text-label text-warm-800 font-medium">Collected this week</p>
          <p className="tnum text-[26px] font-bold text-warm-950 mt-1.5">{formatCurrency(summary.collectedThisWeek)}</p>
        </div>
        <div className="bg-white border border-warm-300 rounded-10 px-5 py-[18px]">
          <p className="text-label text-warm-800 font-medium">Outstanding balance</p>
          <p className="tnum text-[26px] font-bold mt-1.5" style={{ color: summary.outstandingBalance > 0 ? '#B0413A' : '#1A1A1A' }}>
            {formatCurrency(summary.outstandingBalance)}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-[18px]">
        <PaymentsFilterBar defaultQ={q} defaultMethod={method} />
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
            {q || method ? 'Nothing to show' : 'No payments yet'}
          </p>
          <p className="text-ui-sm text-warm-800 max-w-[340px] leading-relaxed">
            {q || method
              ? 'No records match your current filters.'
              : 'Payments recorded against orders will appear here.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
            {/* Desktop header */}
            <div
              className="hidden min-[720px]:grid px-[22px] py-3"
              style={{
                gridTemplateColumns: '1fr 1.2fr 0.7fr 1.4fr 1.1fr 0.9fr 1fr',
                gap: '14px',
                background: '#F8F5F0',
                fontSize: '11.5px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#8A8175',
              }}
            >
              <span>Receipt</span>
              <span>Date</span>
              <span>Order</span>
              <span>Customer</span>
              <span>Method</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
              <span style={{ textAlign: 'right' }}>Recorded by</span>
            </div>

            {rows.map(p => (
              <div
                key={p.id}
                className="border-b border-[#F4F0EA] last:border-0 hover:bg-warm-50 transition-colors"
              >
                {/* Desktop row */}
                <div
                  className="hidden min-[720px]:grid items-center px-[22px] py-[13px]"
                  style={{ gridTemplateColumns: '1fr 1.2fr 0.7fr 1.4fr 1.1fr 0.9fr 1fr', gap: '14px' }}
                >
                  <span className="tnum text-label font-semibold text-warm-900">{p.receiptId}</span>
                  <span className="tnum text-label text-warm-800">{formatDate(p.date)}</span>
                  <Link href={`/orders/${p.orderId}`} className="tnum text-ui font-bold text-brand hover:underline">
                    {p.orderNumber}
                  </Link>
                  <span className="text-ui text-warm-950 truncate">{p.customerName}</span>
                  <MethodPill method={p.method} />
                  <span className="tnum text-[14.5px] font-bold text-right text-success-fg">{formatCurrency(p.amount)}</span>
                  <span className="text-label text-warm-800 text-right">{p.recordedBy}</span>
                </div>

                {/* Mobile row */}
                <div className="min-[720px]:hidden px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <p className="text-ui font-semibold text-warm-950">{p.customerName}</p>
                      <p className="text-caption text-warm-600">{formatDate(p.date)} · {METHOD_LABELS[p.method] ?? p.method}</p>
                    </div>
                    <span className="tnum text-ui font-bold text-success-fg shrink-0">{formatCurrency(p.amount)}</span>
                  </div>
                  <p className="text-caption text-brand">{p.receiptId} · <Link href={`/orders/${p.orderId}`} className="underline">{p.orderNumber}</Link></p>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-[18px]">
              <span className="text-label text-warm-800">Showing {from}–{to} of {total}</span>
              <UrlPagination
                page={page}
                totalPages={totalPages}
                pathname="/payments"
                searchParams={paginationParams}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
