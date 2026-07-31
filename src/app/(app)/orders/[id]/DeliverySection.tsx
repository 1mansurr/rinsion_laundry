'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { requestDelivery } from '@/services/logistics/requestDelivery'
import { confirmDeliveryCompletion } from '@/services/orders/confirmDeliveryCompletion'
import { formatCurrency } from '@/utils/formatCurrency'

const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  assigned: 'Rider assigned',
  in_transit: 'Out for delivery',
}

interface Props {
  orderId: string
  deliveryRequest: { id: string; status: string } | null
  balance: number
}

export function DeliverySection({ orderId, deliveryRequest, balance }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRequest() {
    setError(null)
    startTransition(async () => {
      const res = await requestDelivery(orderId)
      if (!res.success) { setError(res.error); return }
      router.refresh()
    })
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await confirmDeliveryCompletion(orderId)
      if (!res.success) { setError(res.error); return }
      router.refresh()
    })
  }

  return (
    <div className="bg-white border border-warm-300 rounded-18 p-4 space-y-3">
      <p className="text-label font-medium text-warm-700">Delivery</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-12 px-3 py-2 text-caption text-red-700">{error}</div>
      )}

      {!deliveryRequest ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-ui text-warm-600">Send this order out for delivery instead of walk-in collection.</p>
          <button
            onClick={handleRequest}
            disabled={isPending}
            className="bg-brand text-[#FAF8F5] px-4 py-2 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isPending ? 'Requesting…' : 'Request Delivery'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-ui text-warm-700">{STATUS_LABELS[deliveryRequest.status] ?? deliveryRequest.status}</p>
          {balance > 0 ? (
            <p className="text-caption text-warm-500">{formatCurrency(balance)} outstanding — settle payment before confirming delivery.</p>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="bg-brand text-[#FAF8F5] px-4 py-2 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {isPending ? 'Confirming…' : 'Confirm Delivered'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
