import { createAdminClient } from '@/lib/supabase'

export default async function AlertsPage() {
  const supabase = createAdminClient()
  const since24h = new Date(Date.now() - 86400000).toISOString()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: blockedSubs }, { data: stalePending }, { data: quotaData }] = await Promise.all([
    // Laundries in any blocking state
    supabase
      .from('subscriptions')
      .select('id, laundry_id, status, cycle_end_date, laundries(name)')
      .in('status', ['soft_block', 'hard_block', 'locked'])
      .order('cycle_end_date', { ascending: true }),

    // Pending payments older than 24h
    supabase
      .from('pending_payments')
      .select('id, laundry_id, reference_code, claimed_amount, target_plan, payment_type, claimed_at, laundries(name)')
      .is('resolved_at', null)
      .lt('claimed_at', since24h)
      .order('claimed_at', { ascending: true }),

    // Laundries with high quota usage this cycle
    supabase
      .from('subscriptions')
      .select('laundry_id, sms_quota, cycle_start_date, cycle_end_date, laundries(name)')
      .in('status', ['active', 'trialing'])
      .gte('cycle_end_date', today),
  ])

  // Check which laundries are over 80% quota
  type QuotaRow = { laundry_id: string; sms_quota: number; cycle_start_date: string; cycle_end_date: string; laundries: { name: string } | null }
  const highQuota: (QuotaRow & { pct: number })[] = []
  for (const sub of (quotaData ?? []) as unknown as QuotaRow[]) {
    const { count: used } = await supabase
      .from('sms_messages')
      .select('id', { count: 'exact', head: true })
      .eq('laundry_id', sub.laundry_id)
      .eq('counts_toward_cap', true)
      .gte('created_at', sub.cycle_start_date)
    const pct = sub.sms_quota > 0 ? Math.round(((used ?? 0) / sub.sms_quota) * 100) : 0
    if (pct >= 80) highQuota.push({ ...sub, pct })
  }

  const totalAlerts = (blockedSubs?.length ?? 0) + (stalePending?.length ?? 0) + highQuota.length

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-gray-900">Alerts</h1>
        {totalAlerts > 0 && (
          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-bold rounded-full">
            {totalAlerts}
          </span>
        )}
      </div>

      {totalAlerts === 0 && (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 px-5 py-8 text-center">
          No alerts — all clear.
        </p>
      )}

      {/* Blocked subscriptions */}
      {(blockedSubs ?? []).length > 0 && (
        <AlertSection title={`Blocked Subscriptions (${blockedSubs!.length})`}>
          {blockedSubs!.map(s => {
            const laundry = s.laundries as unknown as { name: string } | null
            const daysOverdue = Math.floor((Date.now() - new Date(s.cycle_end_date).getTime()) / 86400000)
            const statusColors: Record<string, string> = {
              soft_block: 'text-yellow-700',
              hard_block: 'text-orange-700',
              locked: 'text-red-700',
            }
            return (
              <div key={s.id} className="flex justify-between px-5 py-3">
                <span className="text-sm text-gray-900">{laundry?.name ?? s.laundry_id}</span>
                <span className={`text-sm font-medium ${statusColors[s.status] ?? 'text-gray-600'}`}>
                  {s.status.replace('_', ' ')} · {daysOverdue}d overdue
                </span>
              </div>
            )
          })}
        </AlertSection>
      )}

      {/* Stale pending payments */}
      {(stalePending ?? []).length > 0 && (
        <AlertSection title={`Pending Payments > 24h Unresolved (${stalePending!.length})`}>
          {stalePending!.map(p => {
            const laundry = p.laundries as unknown as { name: string } | null
            const hoursAgo = Math.floor((Date.now() - new Date(p.claimed_at).getTime()) / 3600000)
            return (
              <div key={p.id} className="px-5 py-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-900">{laundry?.name ?? p.laundry_id}</span>
                  <span className="text-sm font-medium text-red-600">{hoursAgo}h ago</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.reference_code} · GHS {p.claimed_amount} · {p.target_plan} {p.payment_type.replace('_', ' ')}
                </p>
              </div>
            )
          })}
        </AlertSection>
      )}

      {/* High quota */}
      {highQuota.length > 0 && (
        <AlertSection title={`High SMS Quota Usage ≥ 80% (${highQuota.length})`}>
          {highQuota.map(row => (
            <div key={row.laundry_id} className="flex justify-between px-5 py-3">
              <span className="text-sm text-gray-900">{row.laundries?.name ?? row.laundry_id}</span>
              <span className="text-sm font-medium text-amber-600">{row.pct}%</span>
            </div>
          ))}
        </AlertSection>
      )}
    </div>
  )
}

function AlertSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}
