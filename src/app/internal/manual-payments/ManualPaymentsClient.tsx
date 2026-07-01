'use client'

import { useState } from 'react'
import { resolvePayment } from '@/services/admin/resolvePayment'

type PendingPayment = {
  id: string
  laundry_id: string
  laundry_name: string
  reference_code: string
  claimed_amount: number
  target_plan: string
  payment_type: string
  claimed_at: string
}

export default function ManualPaymentsClient({ payments }: { payments: PendingPayment[] }) {
  const [pending, setPending] = useState(payments)
  const [loading, setLoading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handle(id: string, resolution: 'paid' | 'rejected') {
    setLoading(id)
    setErrors(e => ({ ...e, [id]: '' }))
    const result = await resolvePayment(id, resolution)
    if (result.success) {
      setPending(p => p.filter(x => x.id !== id))
    } else {
      setErrors(e => ({ ...e, [id]: result.error }))
    }
    setLoading(null)
  }

  if (pending.length === 0) {
    return (
      <p className="text-ui text-warm-500 bg-white rounded-10 border border-warm-200 px-5 py-8 text-center">
        No pending payments — queue is clear.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {pending.map(p => {
        const hoursAgo = Math.floor((Date.now() - new Date(p.claimed_at).getTime()) / 3600000)
        const isLoading = loading === p.id
        return (
          <div key={p.id} className="bg-white rounded-10 border border-warm-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-ui font-semibold text-warm-950">{p.laundry_name}</p>
                <p className="text-caption text-warm-600 mt-0.5">
                  {p.reference_code} · GHS {p.claimed_amount} · {p.target_plan} {p.payment_type.replace('_', ' ')}
                </p>
                <p className="text-caption text-warm-500 mt-0.5">{hoursAgo}h ago · {new Date(p.claimed_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handle(p.id, 'paid')}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-caption font-medium bg-green-50 text-green-700 rounded-7 hover:bg-green-100 disabled:opacity-50"
                >
                  {isLoading ? '...' : 'Mark Paid'}
                </button>
                <button
                  onClick={() => handle(p.id, 'rejected')}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-caption font-medium bg-red-50 text-red-700 rounded-7 hover:bg-red-100 disabled:opacity-50"
                >
                  {isLoading ? '...' : 'Reject'}
                </button>
              </div>
            </div>
            {errors[p.id] && (
              <p className="text-caption text-red-600 mt-2">{errors[p.id]}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
