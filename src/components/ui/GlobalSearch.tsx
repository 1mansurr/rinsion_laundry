'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// "/" shortcut focuses the search bar; Enter routes to /orders?q=…
// Debounced: 200ms before routing so fast typing doesn't spam navigation.

export function GlobalSearch({ className = '' }: { className?: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        e.key === '/' &&
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        !target.isContentEditable
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setValue(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim()) {
      debounceRef.current = setTimeout(() => {
        router.push(`/orders?q=${encodeURIComponent(q.trim())}`)
      }, 200)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      router.push(`/orders?q=${encodeURIComponent(value.trim())}`)
    }
    if (e.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9A9088"
        strokeWidth="2"
        strokeLinecap="round"
        className="absolute left-3 pointer-events-none"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search orders…"
        aria-label="Search orders"
        className="
          w-full pl-9 pr-10 py-[9px] text-ui-sm
          bg-warm-100 border border-transparent rounded-7 text-warm-950 placeholder:text-warm-600
          focus:outline-none focus:bg-white focus:border-warm-400 focus:shadow-focus-ring
          transition-colors
        "
      />
      {/* "/" shortcut hint */}
      <kbd className="absolute right-3 pointer-events-none text-[11px] font-mono bg-warm-200 border border-warm-300 rounded px-1 py-0.5 text-warm-600 leading-none hidden sm:block">
        /
      </kbd>
    </div>
  )
}
