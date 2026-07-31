'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignRiderToJob } from '@/services/logistics/assignRiderToJob'
import type { RiderCompanyJob } from '@/services/logistics/getRiderCompanyJobQueue'
import type { RosterRider } from '@/services/riders/getRoster'

interface Props {
  jobs: RiderCompanyJob[]
  riders: RosterRider[]
}

const RIDER_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  en_route: 'En route',
  picked_up: 'Picked up',
  dropped_off: 'Dropped off',
}

export function JobQueueList({ jobs, riders }: Props) {
  if (jobs.length === 0) {
    return <p className="text-body text-warm-600">No pickups or deliveries waiting right now.</p>
  }

  return (
    <div className="space-y-3">
      {jobs.map(job => (
        <JobCard key={job.id} job={job} riders={riders} />
      ))}
    </div>
  )
}

function JobCard({ job, riders }: { job: RiderCompanyJob; riders: RosterRider[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedRiderId, setSelectedRiderId] = useState('')

  function handleAssign() {
    if (!selectedRiderId) { setError('Choose a rider first.'); return }
    setError(null)
    startTransition(async () => {
      const res = await assignRiderToJob(job.id, selectedRiderId)
      if (!res.success) { setError(res.error); return }
      router.refresh()
    })
  }

  return (
    <div className="bg-white border border-warm-300 rounded-18 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-ui font-semibold text-warm-950">
            {job.kind === 'pickup' ? 'Pickup' : 'Delivery'} · {job.orderNumber}
          </p>
          <p className="text-caption text-warm-500">{job.customerName} · {job.customerPhone}</p>
        </div>
        <span className="text-caption text-warm-500">
          {job.assignedRiderName ? RIDER_STATUS_LABELS[job.riderStatus ?? ''] ?? job.riderStatus : 'Unassigned'}
        </span>
      </div>

      <div>
        <p className="text-caption text-warm-500">Location</p>
        <p className="text-ui text-warm-950">{job.location ?? '—'}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-12 px-3 py-2 text-caption text-red-700">{error}</div>
      )}

      {job.assignedRiderId ? (
        <p className="text-ui text-warm-700">Assigned to <span className="font-medium">{job.assignedRiderName}</span></p>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selectedRiderId}
            onChange={e => setSelectedRiderId(e.target.value)}
            className="flex-1 border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">Choose a rider…</option>
            {riders.map(r => (
              <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={isPending}
            className="bg-brand text-[#FAF8F5] px-4 py-2 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      )}
    </div>
  )
}
