'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const METHOD_OPTIONS = [
  { value: '', label: 'All methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'momo', label: 'MoMo' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
]

interface Props {
  defaultQ: string
  defaultMethod: string
}

export function PaymentsFilterBar({ defaultQ, defaultMethod }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(defaultQ)
  const [, startTransition] = useTransition()

  function navigate(newQ: string, newMethod: string) {
    const params = new URLSearchParams()
    if (newQ) params.set('q', newQ)
    if (newMethod) params.set('method', newMethod)
    startTransition(() => router.push(`/payments${params.toString() ? '?' + params.toString() : ''}`))
  }

  const inputStyle = 'font-sans text-ui py-[9px] px-3 border border-warm-400 rounded-12 bg-white text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring'

  return (
    <div className="flex gap-[10px] items-center flex-wrap">
      <form
        onSubmit={e => { e.preventDefault(); navigate(q.trim(), defaultMethod) }}
        className="flex items-center gap-2 bg-white border border-warm-400 rounded-12 px-3 py-[9px] flex-1 min-w-[240px]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#9A9088" className="shrink-0">
          <path d="M10 3a7 7 0 1 0 4.2 12.6l4.1 4.1a1 1 0 0 0 1.4-1.4l-4.1-4.1A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search receipt, order # or customer"
          className="flex-1 border-none outline-none text-ui text-warm-950 placeholder:text-warm-600 bg-transparent"
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); navigate('', defaultMethod) }} className="text-warm-500 hover:text-warm-800" aria-label="Clear">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>
      <select
        value={defaultMethod}
        onChange={e => navigate(q.trim(), e.target.value)}
        className={inputStyle}
      >
        {METHOD_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
