import Link from 'next/link'
import { listLaundries } from '@/services/platform/listLaundries'

export default async function PlatformLaundriesPage() {
  const laundries = await listLaundries()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-warm-950">Laundries</h1>
        <Link
          href="/platform/provision"
          className="px-4 py-2 bg-brand text-[#FAF8F5] rounded-7 text-ui font-medium hover:bg-brand-hover transition-colors"
        >
          + Provision Laundry
        </Link>
      </div>

      <div className="bg-white rounded-10 border border-warm-300 divide-y divide-warm-200">
        {laundries.length === 0 && (
          <p className="text-ui text-warm-500 text-center py-8">No laundries yet.</p>
        )}
        {laundries.map(l => (
          <Link
            key={l.id}
            href={`/platform/${l.id}`}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-warm-50 transition-colors"
          >
            <div>
              <p className="text-ui font-medium text-warm-950">{l.name}</p>
              <p className="text-caption text-warm-500 mt-0.5">
                {l.laundryCode} · {l.subscriptionPlan ?? '—'} · {l.subscriptionStatus ?? '—'}
              </p>
            </div>
            <span className={`text-caption px-2 py-0.5 rounded-full font-medium ${
              l.ownerStatus === 'accepted' ? 'bg-green-50 text-green-700'
                : l.ownerStatus === 'pending' ? 'bg-amber-50 text-amber-700'
                : 'bg-warm-100 text-warm-500'
            }`}>
              {l.ownerStatus === 'accepted' ? 'Owner active' : l.ownerStatus === 'pending' ? 'Invite pending' : 'No owner'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
