import { getMyProfile } from '@/services/employees/getMyProfile'
import { getAllReports } from '@/services/reports'
import { formatCurrency } from '@/utils/formatCurrency'
import { redirect } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  received:   'Received',
  confirmed:  'Confirmed',
  processing: 'Processing',
  ready:      'Ready',
  collected:  'Collected',
  cancelled:  'Cancelled',
}

export default async function ReportsPage() {
  const profile = await getMyProfile()
  if (!profile) return null
  if (profile.role !== 'admin') redirect('/dashboard')

  const reports = await getAllReports()
  if (!reports) return null

  const { revenue, orders, employeeActivity } = reports

  const thisMonthLabel = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Reports</h1>

      {/* Revenue */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Revenue</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard label="All Time" value={formatCurrency(revenue.totalAllTime)} />
          <StatCard label={thisMonthLabel} value={formatCurrency(revenue.thisMonth)} />
          <StatCard label="Today" value={formatCurrency(revenue.today)} />
          <StatCard label="Outstanding" value={formatCurrency(revenue.outstandingBalance)} warn={revenue.outstandingBalance > 0} />
        </div>
      </section>

      {/* Orders */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Orders</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatCard label="All Time" value={orders.totalAllTime} />
          <StatCard label={thisMonthLabel} value={orders.thisMonth} />
          <StatCard label="Today" value={orders.today} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">By Status (all time)</p>
          </div>
          <div className="divide-y divide-gray-50">
            {(['received', 'confirmed', 'processing', 'ready', 'collected', 'cancelled'] as const).map(s => (
              <div key={s} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-sm text-gray-600">{STATUS_LABELS[s]}</span>
                <span className="text-sm font-medium text-gray-900">{orders.byStatus[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Employee Activity */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Employee Activity</h2>
        <p className="text-xs text-gray-400 mb-3">{thisMonthLabel}</p>
        <div className="bg-white rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Employee</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Orders Created</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Payments Recorded</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Status Updates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employeeActivity.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-sm text-gray-400 py-8">No activity this month.</td>
                </tr>
              )}
              {employeeActivity.map(e => (
                <tr key={e.employeeId}>
                  <td className="px-5 py-3 text-gray-900 font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{e.ordersCreated}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{e.paymentsRecorded}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{e.statusUpdates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${warn ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
