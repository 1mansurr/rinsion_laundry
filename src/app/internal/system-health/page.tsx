import { createAdminClient } from '@/lib/supabase'

export default async function SystemHealthPage() {
  const supabase = createAdminClient()
  const since24h = new Date(Date.now() - 86400000).toISOString()

  const [
    { count: totalLaundries },
    { count: smsFailures24h },
    { count: smsSent24h },
    { data: recentLogs },
    { data: recentFailedSms },
  ] = await Promise.all([
    supabase.from('laundries').select('*', { count: 'exact', head: true }),
    supabase.from('sms_messages').select('*', { count: 'exact', head: true })
      .eq('status', 'failed').gte('created_at', since24h),
    supabase.from('sms_messages').select('*', { count: 'exact', head: true })
      .gte('created_at', since24h),
    supabase.from('activity_logs')
      .select('id, action_type, description, created_at, laundry_id')
      .in('action_type', ['SMS_FAILED', 'SUBSCRIPTION_LOCKED', 'SUBSCRIPTION_HARD_BLOCK_ENTERED'])
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('sms_messages')
      .select('id, laundry_id, trigger_event, phone, error_message, created_at')
      .eq('status', 'failed')
      .gte('created_at', since24h)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const smsSentCount = smsSent24h ?? 0
  const smsFailCount = smsFailures24h ?? 0
  const successRate = smsSentCount > 0 ? Math.round(((smsSentCount - smsFailCount) / smsSentCount) * 100) : 100

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-lg font-bold text-gray-900">System Health</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Total Laundries" value={totalLaundries ?? 0} />
        <Card label="SMS Sent (24h)" value={smsSentCount} />
        <Card label="SMS Failures (24h)" value={smsFailCount} warn={smsFailCount > 5} />
        <Card label="SMS Success Rate" value={`${successRate}%`} warn={successRate < 90} />
      </div>

      {/* Failed SMS */}
      <Section title={`Failed SMS — last 24h (${smsFailCount})`}>
        {(recentFailedSms ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-4">No failures.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {(recentFailedSms ?? []).map(s => (
              <div key={s.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-500">{s.trigger_event}</span>
                  <span className="text-xs text-gray-400">{s.created_at.substring(0, 16).replace('T', ' ')}</span>
                </div>
                <p className="text-xs text-red-600 mt-0.5">{s.error_message ?? 'Unknown error'}</p>
                <p className="text-xs text-gray-400">{s.phone}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent activity alerts */}
      <Section title="Recent Alerts (SMS failures, hard blocks, locks)">
        {(recentLogs ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-4">Nothing flagged.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {(recentLogs ?? []).map(log => (
              <div key={log.id} className="flex items-start justify-between px-5 py-3">
                <div>
                  <span className="text-xs font-mono text-gray-600">{log.action_type}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{log.description}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-4">
                  {log.created_at.substring(0, 16).replace('T', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Card({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${warn ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}
