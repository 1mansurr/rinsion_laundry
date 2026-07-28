'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approvePickupRequest } from '@/services/pickupRequests/approvePickupRequest'
import { delayPickupRequest } from '@/services/pickupRequests/delayPickupRequest'
import { rejectPickupRequest } from '@/services/pickupRequests/rejectPickupRequest'
import { confirmPickupArrival } from '@/services/pickupRequests/confirmPickupArrival'
import type { PickupRequestListItem } from '@/services/pickupRequests/getPickupRequests'
import { formatCurrency } from '@/utils/formatCurrency'
import { Button } from '@/components/ui/Button'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  delayed: 'Delayed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export function PickupRequestCard({ request }: { request: PickupRequestListItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (!res.success) { setError(res.error ?? 'Something went wrong.'); return }
      router.refresh()
    })
  }

  return (
    <div className="bg-white border border-warm-300 rounded-18 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-ui font-semibold text-warm-950">{request.customerName}</p>
          <p className="text-caption text-warm-500">{request.customerPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-caption text-warm-500">{request.orderNumber}</p>
          <p className="tnum text-ui font-medium text-warm-950">{formatCurrency(request.total)}</p>
        </div>
      </div>

      <div>
        <p className="text-caption text-warm-500">Pickup address</p>
        <p className="text-ui text-warm-950">{request.location ?? '—'}</p>
        {request.notes && <p className="text-caption text-warm-600 mt-0.5">{request.notes}</p>}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-label font-medium text-warm-700">
          {STATUS_LABELS[request.approvalStatus] ?? request.approvalStatus}
          {request.logisticsStatus && request.approvalStatus === 'approved' ? ` · Rider: ${request.logisticsStatus}` : ''}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-12 px-3 py-2 text-caption text-red-700">{error}</div>
      )}

      {(request.approvalStatus === 'pending' || request.approvalStatus === 'delayed') && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" isPending={isPending} disabled={isPending} onClick={() => run(() => approvePickupRequest(request.id))}>
            Approve
          </Button>
          {request.approvalStatus === 'pending' && (
            <Button size="sm" variant="secondary" isPending={isPending} disabled={isPending} onClick={() => run(() => delayPickupRequest(request.id))}>
              Delay
            </Button>
          )}
          <Button size="sm" variant="destructive" isPending={isPending} disabled={isPending} onClick={() => run(() => rejectPickupRequest(request.id))}>
            Reject
          </Button>
        </div>
      )}

      {request.approvalStatus === 'approved' && request.logisticsStatus !== 'completed' && (
        <Button size="sm" variant="primary" isPending={isPending} disabled={isPending} onClick={() => run(() => confirmPickupArrival(request.id))}>
          Mark picked up
        </Button>
      )}
    </div>
  )
}
