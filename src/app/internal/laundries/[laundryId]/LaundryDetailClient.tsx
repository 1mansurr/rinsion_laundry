'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resendOwnerInvite } from '@/services/platform/resendOwnerInvite'
import { convertTrial } from '@/services/platform/convertTrial'
import { extendTrial } from '@/services/platform/extendTrial'
import { suspendLaundry } from '@/services/platform/suspendLaundry'
import { reactivateLaundry } from '@/services/platform/reactivateLaundry'
import type { LaundryDetail } from '@/services/platform/getLaundryDetail'
import type { ServiceResult } from '@/types/serviceResult'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'

export function LaundryDetailClient({ laundry }: { laundry: LaundryDetail }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [extendDays, setExtendDays] = useState('7')

  function run(action: () => Promise<ServiceResult<null>>) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (!res.success) { setError(res.error); return }
      router.refresh()
    })
  }

  const sub = laundry.subscription

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-warm-950">{laundry.name}</h1>
        <p className="text-caption text-warm-500 mt-1">{laundry.laundryCode}</p>
      </div>

      {error && <Banner variant="destructive">{error}</Banner>}

      <section className="bg-white border border-warm-300 rounded-18 p-5 space-y-3">
        <p className="text-label font-medium text-warm-700">Subscription</p>
        {sub ? (
          <>
            <p className="text-ui text-warm-950 capitalize">{sub.plan} · {sub.status}</p>
            <p className="text-caption text-warm-500">Cycle {sub.cycleStartDate} → {sub.cycleEndDate}</p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {sub.status === 'trialing' && (
                <>
                  <Button size="sm" onClick={() => run(() => convertTrial(laundry.id, 'starter'))} isPending={isPending}>
                    Convert to paid
                  </Button>
                  <input
                    type="number"
                    min={1}
                    value={extendDays}
                    onChange={e => setExtendDays(e.target.value)}
                    className="w-16 border border-warm-400 rounded-12 px-2 py-1.5 text-xs text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                  />
                  <Button size="sm" variant="secondary" onClick={() => run(() => extendTrial(laundry.id, parseInt(extendDays, 10) || 0))} disabled={isPending}>
                    Extend trial (days)
                  </Button>
                </>
              )}
              {sub.status === 'locked' ? (
                <Button size="sm" onClick={() => run(() => reactivateLaundry(laundry.id))} isPending={isPending}>
                  Reactivate
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => run(() => suspendLaundry(laundry.id))} disabled={isPending}>
                  Suspend
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="text-ui text-warm-500">No subscription found.</p>
        )}
      </section>

      <section className="bg-white border border-warm-300 rounded-18 p-5 space-y-2">
        <p className="text-label font-medium text-warm-700">Admins</p>
        {laundry.admins.length === 0 && <p className="text-ui text-warm-500">None yet.</p>}
        {laundry.admins.map(a => (
          <p key={a.id} className="text-ui text-warm-950">
            {a.firstName || '—'} {a.lastName} · {a.phone}
          </p>
        ))}
      </section>

      {laundry.pendingInvites.length > 0 && (
        <section className="bg-white border border-warm-300 rounded-18 p-5 space-y-2">
          <p className="text-label font-medium text-warm-700">Pending Invites</p>
          {laundry.pendingInvites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between">
              <p className="text-ui text-warm-950">{inv.phone} · {inv.role}</p>
              <button
                onClick={() => run(() => resendOwnerInvite(inv.id))}
                disabled={isPending}
                className="text-caption text-brand hover:text-brand-hover underline underline-offset-2 disabled:opacity-50"
              >
                Resend
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
