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
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laundries</h1>
            <p className="text-sm text-gray-500 mt-0.5">Internal admin · {laundries?.length ?? 0} total</p>
          </div>
          <Link
            href="/internal/create-laundry"
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
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
              <div key={laundry.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{laundry.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{laundry.laundry_code}</span>
                  </div>
                  {owner && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">
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
            <p className="text-center text-sm text-gray-400 py-12">No laundries yet.</p>
          )}
        </div>
      </div>
    </main>
  )
}

function SubscriptionBadge({ status, daysLeft }: { status: string; daysLeft: number | null }) {
  const styles: Record<string, string> = {
    trialing:   'bg-blue-50 text-blue-700',
    active:     'bg-green-50 text-green-700',
    soft_block: 'bg-yellow-50 text-yellow-700',
    hard_block: 'bg-orange-50 text-orange-700',
    locked:     'bg-red-50 text-red-700',
    cancelled:  'bg-gray-100 text-gray-500',
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
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {label[status] ?? status}
    </span>
  )
}
