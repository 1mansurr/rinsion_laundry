import { createAdminClient } from '@/lib/supabase'

export default async function SmsHealthPage() {
  const supabase = createAdminClient()
  const since24h = new Date(Date.now() - 86400000).toISOString()

  const [
    { count: totalSent },
    { count: totalFailed },
    { count: sent24h },
    { count: _failed24h },
    { data: quotaData },
  ] = await Promise.all([
    supabase.from('sms_messages').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('sms_messages').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('sms_messages').select('*', { count: 'exact', head: true })
      .eq('status', 'sent').gte('created_at', since24h),
    supabase.from('sms_messages').select('*', { count: 'exact', head: true })
      .eq('status', 'failed').gte('created_at', since24h),
    supabase
      .from('subscriptions')
      .select('laundry_id, sms_quota, cycle_start_date, cycle_end_date, laundries(name)')
      .in('status', ['active', 'trialing', 'soft_block'])
      .order('cycle_end_date', { ascending: false }),
  ])

  const total = (totalSent ?? 0) + (totalFailed ?? 0)
  const successRate = total > 0 ? Math.round(((totalSent ?? 0) / total) * 100) : 100

  type QuotaRow = {
    laundry_id: string
    sms_quota: number
    cycle_start_date: string
    cycle_end_date: string
    laundries: { name: string } | null
  }

  const rows: (QuotaRow & { used: number })[] = []
  for (const sub of (quotaData ?? []) as unknown as QuotaRow[]) {
    const { count: used } = await supabase
      .from('sms_messages')
      .select('id', { count: 'exact', head: true })
      .eq('laundry_id', sub.laundry_id)
      .eq('counts_toward_cap', true)
      .gte('created_at', sub.cycle_start_date)
      .lte('created_at', sub.cycle_end_date + 'T23:59:59')
    rows.push({ ...sub, used: used ?? 0 })
  }

  rows.sort((a, b) => (b.used / b.sms_quota) - (a.used / a.sms_quota))

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-h2 font-semibold text-warm-950">SMS Health</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Total Sent"     value={totalSent ?? 0} />
        <Card label="Total Failed"   value={totalFailed ?? 0} warn={(totalFailed ?? 0) > 0} />
        <Card label="Sent (24h)"     value={sent24h ?? 0} />
        <Card label="Success Rate"   value={`${successRate}%`} warn={successRate < 90} />
      </div>

      <div className="bg-white rounded-18 border border-warm-200">
        <div className="px-5 py-3.5 border-b border-warm-100">
          <h2 className="text-ui font-semibold text-warm-950">Quota Usage by Laundry (current cycle)</h2>
        </div>
        {rows.length === 0 ? (
          <p className="text-ui text-warm-500 px-5 py-4">No active subscriptions.</p>
        ) : (
          <div className="divide-y divide-warm-100">
            {rows.map(row => {
              const pct = row.sms_quota > 0 ? Math.round((row.used / row.sms_quota) * 100) : 0
              return (
                <div key={row.laundry_id} className="px-5 py-3">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-ui text-warm-950">{row.laundries?.name ?? row.laundry_id}</span>
                    <span className={`tnum text-ui font-medium ${pct >= 70 ? 'text-amber-600' : 'text-warm-600'}`}>
                      {row.used}/{row.sms_quota} ({pct}%)
                    </span>
                  </div>
                  <div className="bg-warm-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${pct >= 70 ? 'bg-amber-400' : 'bg-warm-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="bg-white rounded-18 border border-warm-200 p-4">
      <p className="text-caption text-warm-600 mb-1">{label}</p>
      <p className={`tnum text-xl font-bold ${warn ? 'text-amber-600' : 'text-warm-950'}`}>{value}</p>
    </div>
  )
}
