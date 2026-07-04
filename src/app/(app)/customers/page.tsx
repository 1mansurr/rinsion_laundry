import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getCustomersList } from '@/services/customers/getCustomersList'
import { UrlPagination } from '@/components/ui/UrlPagination'
import { CustomersFilterBar } from './CustomersFilterBar'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'

const PER_PAGE = 30

interface Props {
  searchParams: { q?: string; page?: string }
}

export default async function CustomersPage({ searchParams }: Props) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const q = searchParams.q ?? ''
  const page = Math.max(1, Number(searchParams.page ?? '1'))

  const { rows, total } = await getCustomersList(profile.laundryId, { q, page, perPage: PER_PAGE })

  const totalPages = Math.ceil(total / PER_PAGE)
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const to = Math.min(page * PER_PAGE, total)

  const paginationParams: Record<string, string> = {}
  if (q) paginationParams.q = q

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      {/* Page header */}
      <div className="flex items-end justify-between mb-1">
        <div>
          <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Customers</h1>
          <p className="text-ui text-warm-800 mt-1">
            {total} customer{total !== 1 ? 's' : ''}
            {profile.role === 'admin' ? ' · All branches' : ''}
          </p>
        </div>
        <Link
          href="/customers/new"
          className="inline-flex items-center gap-[7px] bg-brand text-[#FAF8F5] text-ui font-semibold px-[15px] py-[10px] rounded-7 hover:bg-brand-hover transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#FAF8F5">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.5-8 5.5V21a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-3-3.6-5.5-8-5.5Z" />
          </svg>
          New Customer
        </Link>
      </div>

      {/* Filter bar */}
      <div className="mt-[18px] mb-[18px] flex gap-[10px] items-center flex-wrap">
        <CustomersFilterBar defaultQ={q} />
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
            {q ? 'Nothing to show' : 'No customers yet'}
          </p>
          <p className="text-ui-sm text-warm-800 max-w-[340px] leading-relaxed">
            {q
              ? 'No records match your search. Try a different name or phone number.'
              : 'Add your first customer to start creating orders.'}
          </p>
          {!q && (
            <Link href="/customers/new" className="mt-4 inline-flex items-center gap-1.5 bg-brand text-[#FAF8F5] text-ui font-semibold px-4 py-2.5 rounded-7 hover:bg-brand-hover transition-colors">
              Add Customer
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
                gridTemplateColumns: '1.8fr 1.1fr 0.7fr 1fr 1fr 0.9fr 30px',
                gap: '14px',
                background: '#F8F5F0',
                fontSize: '11.5px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#8A8175',
              }}
            >
              <span>Customer</span>
              <span>Phone</span>
              <span style={{ textAlign: 'right' }}>Orders</span>
              <span style={{ textAlign: 'right' }}>Total spent</span>
              <span style={{ textAlign: 'right' }}>Outstanding</span>
              <span style={{ textAlign: 'right' }}>Last order</span>
              <span />
            </div>

            {rows.map(c => {
              const initials = `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase()
              return (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="block border-b border-[#F4F0EA] last:border-0 hover:bg-warm-50 transition-colors"
                >
                  {/* Desktop row */}
                  <div
                    className="hidden min-[720px]:grid items-center px-[22px] py-[14px]"
                    style={{ gridTemplateColumns: '1.8fr 1.1fr 0.7fr 1fr 1fr 0.9fr 30px', gap: '14px' }}
                  >
                    <div className="flex items-center gap-[11px] min-w-0">
                      <span className="w-[34px] h-[34px] shrink-0 rounded-full bg-brand text-[#FAF8F5] flex items-center justify-center text-caption font-semibold">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <div className="text-ui-sm font-semibold text-warm-950 truncate">
                          {c.firstName} {c.lastName}
                        </div>
                      </div>
                    </div>
                    <span className="tnum text-label text-warm-900">{c.phone}</span>
                    <span className="tnum text-ui text-warm-900 text-right">{c.ordersCount}</span>
                    <span className="tnum text-ui font-semibold text-warm-950 text-right">
                      {formatCurrency(c.totalSpent)}
                    </span>
                    <span className={`tnum text-ui font-semibold text-right ${c.outstandingBalance > 0 ? 'text-error' : 'text-warm-600'}`}>
                      {c.outstandingBalance > 0 ? formatCurrency(c.outstandingBalance) : '—'}
                    </span>
                    <span className="text-label text-warm-800 text-right">
                      {c.lastOrderDate ? formatDate(c.lastOrderDate) : '—'}
                    </span>
                    <span className="flex justify-end">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#C7C0B6">
                        <path d="M9 6.4 14.6 12 9 17.6 10.4 19l7-7-7-7L9 6.4Z" />
                      </svg>
                    </span>
                  </div>

                  {/* Mobile row */}
                  <div className="min-[720px]:hidden px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 shrink-0 rounded-full bg-brand text-[#FAF8F5] flex items-center justify-center text-caption font-semibold">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-ui font-semibold text-warm-950 truncate">{c.firstName} {c.lastName}</p>
                          <p className="text-caption text-warm-600">{c.phone}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-caption text-warm-600">{c.ordersCount} order{c.ordersCount !== 1 ? 's' : ''}</p>
                        {c.outstandingBalance > 0 && (
                          <p className="text-caption font-semibold text-error">{formatCurrency(c.outstandingBalance)} due</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-[18px]">
              <span className="text-label text-warm-800">Showing {from}–{to} of {total}</span>
              <UrlPagination
                page={page}
                totalPages={totalPages}
                pathname="/customers"
                searchParams={paginationParams}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
