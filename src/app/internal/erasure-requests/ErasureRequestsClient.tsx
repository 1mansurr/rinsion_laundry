'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createErasureRequest } from '@/services/platform/createErasureRequest'
import { fulfillErasureRequest } from '@/services/platform/fulfillErasureRequest'

type ErasureRequest = {
  id: string
  laundryId: string
  laundryName: string
  subjectType: 'customer' | 'employee'
  subjectId: string
  reason: string | null
  requestedAt: string
}

type LaundryOption = { id: string; name: string }

const inputClass =
  'w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'

export function ErasureRequestsClient({
  requests,
  laundries,
}: {
  requests: ErasureRequest[]
  laundries: LaundryOption[]
}) {
  const router = useRouter()

  // Synced from the server-refreshed `requests` prop (after a successful
  // create) but also mutated locally (optimistic removal on fulfill) — the
  // effect keeps the two reconciled without a full page reload either way.
  const [pending, setPending] = useState(requests)
  useEffect(() => setPending(requests), [requests])

  const [fulfilling, setFulfilling] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  const [laundryId, setLaundryId] = useState(laundries[0]?.id ?? '')
  const [subjectType, setSubjectType] = useState<'customer' | 'employee'>('customer')
  const [subjectId, setSubjectId] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setCreating(true)
    const result = await createErasureRequest({
      laundryId,
      subjectType,
      subjectId: subjectId.trim(),
      reason: reason.trim() || undefined,
    })
    setCreating(false)
    if (!result.success) {
      setFormError(result.error)
      return
    }
    setSubjectId('')
    setReason('')
    router.refresh()
  }

  async function handleFulfill(id: string) {
    if (!confirm('This permanently anonymizes the subject\'s data. This cannot be undone. Continue?')) return
    setFulfilling(id)
    setRowErrors(e => ({ ...e, [id]: '' }))
    const result = await fulfillErasureRequest(id)
    if (result.success) {
      setPending(p => p.filter(r => r.id !== id))
    } else {
      setRowErrors(e => ({ ...e, [id]: result.error }))
    }
    setFulfilling(null)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white rounded-10 border border-warm-200 p-5 space-y-4">
        <h2 className="text-ui font-semibold text-warm-950">New erasure request</h2>
        {formError && <p className="text-caption text-red-600">{formError}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-label font-medium text-warm-800 mb-1">Laundry</label>
            <select value={laundryId} onChange={e => setLaundryId(e.target.value)} required className={inputClass}>
              {laundries.length === 0 && <option value="">No laundries</option>}
              {laundries.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-label font-medium text-warm-800 mb-1">Subject type</label>
            <select
              value={subjectType}
              onChange={e => setSubjectType(e.target.value as 'customer' | 'employee')}
              className={inputClass}
            >
              <option value="customer">Customer</option>
              <option value="employee">Employee</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-label font-medium text-warm-800 mb-1">Subject ID</label>
          <input
            type="text"
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            required
            placeholder="UUID of the customer or employee row"
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className="block text-label font-medium text-warm-800 mb-1">Reason (internal only, never shown to the tenant)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Act 843 request via support ticket #1234"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={creating || !laundryId}
          className="px-4 py-2 text-ui font-semibold bg-brand text-[#FAF8F5] rounded-7 hover:bg-brand-hover disabled:opacity-50"
        >
          {creating ? 'Recording…' : 'Record request'}
        </button>
      </form>

      {pending.length === 0 ? (
        <p className="text-ui text-warm-500 bg-white rounded-10 border border-warm-200 px-5 py-8 text-center">
          No pending erasure requests.
        </p>
      ) : (
        <div className="space-y-3">
          {pending.map(r => {
            const isFulfilling = fulfilling === r.id
            return (
              <div key={r.id} className="bg-white rounded-10 border border-warm-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-ui font-semibold text-warm-950">{r.laundryName}</p>
                    <p className="text-caption text-warm-600 mt-0.5 font-mono">{r.subjectType} · {r.subjectId}</p>
                    {r.reason && <p className="text-caption text-warm-600 mt-0.5">{r.reason}</p>}
                    <p className="text-caption text-warm-500 mt-0.5">{new Date(r.requestedAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleFulfill(r.id)}
                    disabled={isFulfilling}
                    className="px-3 py-1.5 text-caption font-medium bg-red-50 text-red-700 rounded-7 hover:bg-red-100 disabled:opacity-50 flex-shrink-0"
                  >
                    {isFulfilling ? '...' : 'Fulfill (irreversible)'}
                  </button>
                </div>
                {rowErrors[r.id] && <p className="text-caption text-red-600 mt-2">{rowErrors[r.id]}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
