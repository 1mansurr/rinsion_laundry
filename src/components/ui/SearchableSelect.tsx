'use client'

import { useEffect, useRef, useState } from 'react'

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Filter input only renders once the list is at least this long — short
   * lists (e.g. ~4 services) don't need it, longer ones (e.g. item types) do. */
  searchThreshold?: number
}

/** Custom searchable dropdown for fields with enough options that scanning a
 * native <select> is slow (services, item types). Mirrors the customer
 * picker pattern already used in Create Order. Use the plain Select
 * component for short, static enums instead. */
export function SearchableSelect({
  value, onChange, options, placeholder = 'Select…', disabled, className = '', searchThreshold = 5,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)
  const showSearch = options.length >= searchThreshold

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setHighlighted(0)
    const id = requestAnimationFrame(() => (showSearch ? searchRef.current : listRef.current)?.focus())
    return () => cancelAnimationFrame(id)
  }, [open, showSearch])

  const filtered = showSearch && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  function selectOption(opt: SearchableSelectOption) {
    onChange(opt.value)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[highlighted]
      if (opt) selectOption(opt)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 border border-warm-400 rounded-12 px-3 py-[10px] text-ui bg-white text-left focus:outline-none focus:border-brand focus:shadow-focus-ring disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        <span className={`truncate ${selected ? 'text-warm-950' : 'text-warm-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="#6B6259" aria-hidden
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M12 15.5 5.7 9.2a1 1 0 0 1 1.4-1.4l5.9 5.9 5.9-5.9a1 1 0 1 1 1.4 1.4L12 15.5Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-warm-300 rounded-18 shadow-modal overflow-hidden">
          {showSearch && (
            <input
              ref={searchRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setHighlighted(0) }}
              onKeyDown={handleKeyDown}
              placeholder="Search…"
              className="w-full px-3 py-2 text-ui text-warm-950 placeholder:text-warm-400 border-b border-warm-100 focus:outline-none"
            />
          )}
          <div
            ref={listRef}
            tabIndex={showSearch ? -1 : 0}
            onKeyDown={showSearch ? undefined : handleKeyDown}
            className="max-h-56 overflow-y-auto focus:outline-none"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2.5 text-body text-warm-500">No matches</div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`w-full text-left px-3 py-2 text-ui transition-colors ${
                    opt.value === value ? 'text-brand font-medium' : 'text-warm-950'
                  } ${i === highlighted ? 'bg-warm-100' : 'hover:bg-warm-100'}`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
