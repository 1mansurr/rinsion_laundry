'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'received', label: 'Received' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'collected', label: 'Collected' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface Props {
  defaultQ: string
  defaultStatus: string
}

export function OrdersFilterBar({ defaultQ, defaultStatus }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(defaultQ)
  const [, startTransition] = useTransition()

  function navigate(newQ: string, newStatus: string) {
    const params = new URLSearchParams()
    if (newQ) params.set('q', newQ)
    if (newStatus) params.set('status', newStatus)
    startTransition(() => router.push(`/orders${params.toString() ? '?' + params.toString() : ''}`))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate(q.trim(), defaultStatus)
  }

  function handleStatus(newStatus: string) {
    navigate(q.trim(), newStatus)
  }

  const inputStyle = 'font-sans text-ui py-[9px] px-3 border border-warm-400 rounded-[8px] bg-white text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring'

  return (
    <div className="flex gap-[10px] items-center flex-wrap">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 bg-white border border-warm-400 rounded-[8px] px-3 py-[9px] flex-1 min-w-[240px]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#9A9088" className="shrink-0">
          <path d="M10 3a7 7 0 1 0 4.2 12.6l4.1 4.1a1 1 0 0 0 1.4-1.4l-4.1-4.1A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or order #"
          className="flex-1 border-none outline-none text-ui text-warm-950 placeholder:text-warm-600 bg-transparent"
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); navigate('', defaultStatus) }}
            className="text-warm-500 hover:text-warm-800"
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>
      <select
        value={defaultStatus}
        onChange={e => handleStatus(e.target.value)}
        className={inputStyle}
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
