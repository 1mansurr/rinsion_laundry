'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptJob } from '@/services/riders/acceptJob'
import { bulkUpdateJobStatus } from '@/services/riders/bulkUpdateJobStatus'
import type { MyJob } from '@/services/riders/getMyJobs'
import type { RiderJobStatus } from '@/constants/statuses'

const STATUS_LABELS: Record<RiderJobStatus, string> = {
  assigned: 'Assigned',
  en_route: 'En route',
  picked_up: 'Picked up',
  dropped_off: 'Dropped off',
}

const NEXT_STATUS_OPTIONS: RiderJobStatus[] = ['en_route', 'picked_up', 'dropped_off']

export function MyJobsList({ jobs }: { jobs: MyJob[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targetStatus, setTargetStatus] = useState<RiderJobStatus>('en_route')

  const pendingAcceptance = jobs.filter(j => !j.accepted)
  const active = jobs.filter(j => j.accepted)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAccept(jobId: string) {
    setError(null)
    startTransition(async () => {
      const res = await acceptJob(jobId)
      if (!res.success) { setError(res.error); return }
      router.refresh()
    })
  }

  function handleBulkUpdate() {
    if (selected.size === 0) { setError('Select at least one job.'); return }
    setError(null)
    startTransition(async () => {
      const res = await bulkUpdateJobStatus(Array.from(selected), targetStatus)
      if (!res.success) { setError(res.error); return }
      setSelected(new Set())
      router.refresh()
    })
  }

  if (jobs.length === 0) {
    return <p className="text-body text-warm-600">No jobs assigned to you right now.</p>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-12 px-4 py-3 text-ui text-red-700">{error}</div>
      )}

      {pendingAcceptance.length > 0 && (
        <div>
          <p className="text-label font-medium text-warm-700 mb-2">Needs your acceptance</p>
          <div className="space-y-2">
            {pendingAcceptance.map(job => (
              <div key={job.id} className="bg-white border border-warm-300 rounded-18 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-ui font-semibold text-warm-950">
                    {job.kind === 'pickup' ? 'Pickup' : 'Delivery'} · {job.orderNumber}
                  </p>
                  <p className="text-caption text-warm-500">{job.location ?? '—'}</p>
                </div>
                <button
                  onClick={() => handleAccept(job.id)}
                  disabled={isPending}
                  className="bg-brand text-[#FAF8F5] px-4 py-2 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <p className="text-label font-medium text-warm-700 mb-2">Active jobs</p>
          <div className="space-y-2">
            {active.map(job => (
              <label key={job.id} className="bg-white border border-warm-300 rounded-18 p-4 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(job.id)}
                  onChange={() => toggleSelect(job.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-ui font-semibold text-warm-950">
                    {job.kind === 'pickup' ? 'Pickup' : 'Delivery'} · {job.orderNumber}
                  </p>
                  <p className="text-caption text-warm-500">{job.customerName} · {job.customerPhone}</p>
                  <p className="text-caption text-warm-500">{job.location ?? '—'}</p>
                </div>
                <span className="text-caption text-warm-500 shrink-0">
                  {job.riderStatus ? STATUS_LABELS[job.riderStatus] : ''}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <select
              value={targetStatus}
              onChange={e => setTargetStatus(e.target.value as RiderJobStatus)}
              className="border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {NEXT_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={isPending || selected.size === 0}
              className="bg-brand text-[#FAF8F5] px-4 py-2 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Updating…' : `Mark ${selected.size || ''} selected`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
