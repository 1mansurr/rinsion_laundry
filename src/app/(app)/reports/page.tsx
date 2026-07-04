import { redirect } from 'next/navigation'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getAllReports } from '@/services/reports'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { formatCurrency } from '@/utils/formatCurrency'
import type { EmployeeActivityItem } from '@/services/reports'

const STATUS_LABELS: Record<string, string> = {
  received:   'Received',
  confirmed:  'Confirmed',
  processing: 'Processing',
  ready:      'Ready',
  collected:  'Collected',
  cancelled:  'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  received:   '#8C857B',
  confirmed:  '#2F6F9E',
  processing: '#B8801F',
  ready:      '#0F3D2E',
  collected:  '#5E7A6B',
  cancelled:  '#B0413A',
}

export default async function ReportsPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-[1180px] mx-auto px-7 py-7">
        <div className="mb-[18px]">
          <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Reports</h1>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  const reports = await getAllReports()
  if (!reports) redirect('/login')

  const { revenue, orders, employeeActivity } = reports

  const thisMonthLabel = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })
  const totalOrders = orders.totalAllTime || 1

  const revCards = [
    { label: 'All time revenue',  value: formatCurrency(revenue.totalAllTime) },
    { label: thisMonthLabel,      value: formatCurrency(revenue.thisMonth) },
    { label: 'Today',             value: formatCurrency(revenue.today) },
    { label: 'Outstanding',       value: formatCurrency(revenue.outstandingBalance), warn: revenue.outstandingBalance > 0 },
  ]

  const statusBarData = (['received', 'confirmed', 'processing', 'ready', 'collected', 'cancelled'] as const).map(s => {
    const count = orders.byStatus[s] ?? 0
    const pct = Math.round((count / totalOrders) * 100)
    return { label: STATUS_LABELS[s], count, pct, color: STATUS_COLORS[s] }
  })

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      {/* Header */}
      <div className="flex items-end justify-between mb-[18px]">
        <div>
          <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Reports</h1>
          <p className="text-ui text-warm-800 mt-1">All time · All branches</p>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {revCards.map(c => (
          <div key={c.label} className="bg-white border border-warm-300 rounded-10 px-5 py-[18px]">
            <p className="text-caption text-warm-800 font-medium">{c.label}</p>
            <p className={`tnum text-[24px] font-bold tracking-[-0.01em] mt-1.5 ${c.warn ? 'text-error' : 'text-warm-950'}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Orders by status + Employee activity */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4 mb-4">
        {/* Orders by status — CSS bar chart */}
        <div className="bg-white border border-warm-300 rounded-10 px-[22px] py-5">
          <h2 className="text-h2 font-semibold text-warm-950 mb-[18px]">Orders by status</h2>
          <div className="space-y-3.5">
            {statusBarData.map(s => (
              <div key={s.label}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-label text-warm-900">{s.label}</span>
                  <span className="tnum text-label text-warm-700 font-semibold">{s.count} · {s.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-warm-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${s.pct}%`, background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-caption text-warm-600 mt-4">{orders.totalAllTime} total orders · {orders.today} today</p>
        </div>

        {/* Employee activity */}
        <div className="bg-white border border-warm-300 rounded-10 overflow-hidden">
          <div className="px-5 py-4 border-b border-warm-200">
            <h2 className="text-h2 font-semibold text-warm-950">Employee activity</h2>
            <p className="text-caption text-warm-600 mt-0.5">{thisMonthLabel}</p>
          </div>
          {/* Desktop header */}
          <div
            className="hidden min-[720px]:grid px-5 py-2.5 border-b border-warm-100"
            style={{
              gridTemplateColumns: '1.6fr 0.8fr 1fr 0.8fr',
              gap: '12px',
              background: '#F8F5F0',
              fontSize: '11.5px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#8A8175',
            }}
          >
            <span>Member</span>
            <span style={{ textAlign: 'right' }}>Orders</span>
            <span style={{ textAlign: 'right' }}>Payments</span>
            <span style={{ textAlign: 'right' }}>Updates</span>
          </div>
          {employeeActivity.length === 0 ? (
            <p className="text-ui text-warm-600 text-center py-10">No activity this month.</p>
          ) : (
            <div>
              {employeeActivity.map((e: EmployeeActivityItem) => {
                const initials = e.name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2)
                return (
                  <div
                    key={e.employeeId}
                    className="border-b border-[#F4F0EA] last:border-0"
                  >
                    {/* Desktop row */}
                    <div
                      className="hidden min-[720px]:grid items-center px-5 py-[13px]"
                      style={{ gridTemplateColumns: '1.6fr 0.8fr 1fr 0.8fr', gap: '12px' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-[30px] h-[30px] shrink-0 rounded-full bg-brand-pale text-brand flex items-center justify-center text-[11.5px] font-semibold">
                          {initials}
                        </span>
                        <span className="text-ui font-semibold text-warm-950 truncate">{e.name}</span>
                      </div>
                      <span className="tnum text-ui text-right text-warm-900">{e.ordersCreated}</span>
                      <span className="tnum text-ui font-semibold text-right text-warm-950">{e.paymentsRecorded}</span>
                      <span className="tnum text-label text-right text-warm-800">{e.statusUpdates}</span>
                    </div>
                    {/* Mobile row */}
                    <div className="min-[720px]:hidden flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-brand-pale text-brand flex items-center justify-center text-caption font-semibold">
                          {initials}
                        </span>
                        <span className="text-ui font-medium text-warm-950">{e.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-caption text-warm-700">{e.ordersCreated} orders · {e.paymentsRecorded} payments</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
