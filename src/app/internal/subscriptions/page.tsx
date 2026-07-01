import { createAdminClient } from '@/lib/supabase'

export default async function InternalSubscriptionsPage() {
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [{ data: subs }, { data: expiringTrials }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, status')
      .not('status', 'in', '("cancelled")'),
    supabase
      .from('subscriptions')
      .select('id, laundry_id, plan, cycle_end_date, laundries(name)')
      .eq('status', 'trialing')
      .lte('cycle_end_date', in7Days)
      .gte('cycle_end_date', today)
      .order('cycle_end_date', { ascending: true }),
  ])

  const allSubs = subs ?? []

  const counts = {
    trialing:   allSubs.filter(s => s.status === 'trialing').length,
    active:     allSubs.filter(s => s.status === 'active').length,
    soft_block: allSubs.filter(s => s.status === 'soft_block').length,
    hard_block: allSubs.filter(s => s.status === 'hard_block').length,
    locked:     allSubs.filter(s => s.status === 'locked').length,
  }

  const planCounts = {
    trial:   allSubs.filter(s => s.plan === 'trial').length,
    starter: allSubs.filter(s => s.plan === 'starter').length,
    growth:  allSubs.filter(s => s.plan === 'growth').length,
  }

  const activeSubs = allSubs.filter(s => s.status === 'active')
  const mrr =
    activeSubs.filter(s => s.plan === 'starter').length * 90 +
    activeSubs.filter(s => s.plan === 'growth').length * 180

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Subscriptions</h1>
        <span className="text-sm text-gray-500">MRR: <span className="font-bold text-gray-900">GHS {mrr}</span></span>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        <StatBadge label="Trialing" value={counts.trialing} color="blue" />
        <StatBadge label="Active" value={counts.active} color="green" />
        <StatBadge label="Soft Block" value={counts.soft_block} color="yellow" />
        <StatBadge label="Hard Block" value={counts.hard_block} color="orange" />
        <StatBadge label="Locked" value={counts.locked} color="red" />
      </div>

      {/* Plan breakdown */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">By Plan</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {(['trial', 'starter', 'growth'] as const).map(plan => (
            <div key={plan} className="flex justify-between px-5 py-3">
              <span className="text-sm capitalize text-gray-700">{plan}</span>
              <span className="text-sm font-medium text-gray-900">{planCounts[plan]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trials expiring in 7 days */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Trials Expiring Soon ({(expiringTrials ?? []).length})
          </h2>
        </div>
        {(expiringTrials ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-4">None in the next 7 days.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {(expiringTrials ?? []).map(s => {
              const laundry = s.laundries as unknown as { name: string } | null
              const daysLeft = Math.ceil((new Date(s.cycle_end_date).getTime() - Date.now()) / 86400000)
              return (
                <div key={s.id} className="flex justify-between px-5 py-3">
                  <span className="text-sm text-gray-900">{laundry?.name ?? s.laundry_id}</span>
                  <span className={`text-sm font-medium ${daysLeft <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                    {daysLeft}d left
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-800',
    orange: 'bg-orange-50 text-orange-700',
    red:    'bg-red-50 text-red-700',
  }
  return (
    <div className={`rounded-xl p-3 ${colors[color] ?? 'bg-gray-50 text-gray-700'}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 font-medium">{label}</p>
    </div>
  )
}
