import { createAdminClient } from '@/lib/supabase'
import { StartTrialButton } from './StartTrialButton'
import Link from 'next/link'

export default async function InternalLaundriesPage() {
  const admin = createAdminClient()

  const { data: laundries } = await admin
    .from('laundries')
    .select(`
      id, name, laundry_code, created_at,
      subscriptions(id, plan, status, cycle_start_date, cycle_end_date),
      employees(first_name, last_name, email, role)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h2 font-semibold text-warm-950">Laundries</h1>
          <p className="text-ui text-warm-600 mt-0.5">{laundries?.length ?? 0} total</p>
        </div>
        <Link
          href="/internal/create-laundry"
          className="px-4 py-2 bg-brand text-[#FAF8F5] text-ui font-semibold rounded-7 hover:bg-brand-hover transition-colors"
        >
          + Provision new
        </Link>
      </div>

      <div className="space-y-3">
        {laundries?.map((laundry) => {
          const owner = (laundry.employees as { first_name: string; last_name: string; email: string; role: string }[])
            ?.find((e) => e.role === 'admin')

          const activeSub = (laundry.subscriptions as {
            id: string; plan: string; status: string; cycle_start_date: string; cycle_end_date: string
          }[])?.find((s) => s.status !== 'cancelled')

          const daysLeft = activeSub
            ? Math.max(0, Math.ceil((new Date(activeSub.cycle_end_date).getTime() - Date.now()) / 86400000))
            : null

          return (
            <div key={laundry.id} className="bg-white rounded-10 border border-warm-200 px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-ui font-semibold text-warm-950">{laundry.name}</span>
                  <span className="text-caption text-warm-500 font-mono">{laundry.laundry_code}</span>
                </div>
                {owner && (
                  <p className="text-caption text-warm-600 mt-0.5 truncate">
                    {owner.first_name} {owner.last_name} · {owner.email}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {activeSub ? (
                  <SubscriptionBadge status={activeSub.status} daysLeft={daysLeft} />
                ) : (
                  <StartTrialButton laundryId={laundry.id} />
                )}
              </div>
            </div>
          )
        })}

        {!laundries?.length && (
          <p className="text-center text-ui text-warm-500 py-12">No laundries yet.</p>
        )}
      </div>
    </div>
  )
}

function SubscriptionBadge({ status, daysLeft }: { status: string; daysLeft: number | null }) {
  const styles: Record<string, string> = {
    trialing:   'bg-blue-50 text-blue-700',
    active:     'bg-green-50 text-green-700',
    soft_block: 'bg-yellow-50 text-yellow-700',
    hard_block: 'bg-orange-50 text-orange-700',
    locked:     'bg-red-50 text-red-700',
    cancelled:  'bg-warm-100 text-warm-600',
  }

  const label: Record<string, string> = {
    trialing:   `Trial · ${daysLeft}d left`,
    active:     `Active · ${daysLeft}d left`,
    soft_block: 'Soft block',
    hard_block: 'Hard block',
    locked:     'Locked',
    cancelled:  'Cancelled',
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-caption font-medium ${styles[status] ?? 'bg-warm-100 text-warm-600'}`}>
      {label[status] ?? status}
    </span>
  )
}
