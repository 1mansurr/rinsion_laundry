'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function OrderSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `/orders?q=${encodeURIComponent(q)}` : '/orders')
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Search by order ID, pickup code, customer name or phone…"
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {value && (
          <button
            type="button"
            onClick={() => { setValue(''); router.push('/orders') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>
    </form>
  )
}
