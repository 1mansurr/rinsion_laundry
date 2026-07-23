'use client'

import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Cmd/Ctrl+K to open. 5-6 common navigation/action items.
// Portal-rendered so it floats over any z-index context.

interface CommandItem {
  id: string
  label: string
  description?: string
  shortcut?: string
  onSelect: () => void
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const go = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  const items: CommandItem[] = [
    { id: 'new-order', label: 'New order', description: 'Create a new laundry order', onSelect: () => go('/orders/new') },
    { id: 'orders', label: 'All orders', description: 'View and manage orders', onSelect: () => go('/orders') },
    { id: 'pickup', label: 'Pickup scanner', description: 'Scan pickup codes', onSelect: () => go('/pickup') },
    { id: 'customers', label: 'Customers', description: 'Browse customer list', onSelect: () => go('/customers') },
    { id: 'payments', label: 'Payments', description: 'View payment records', onSelect: () => go('/payments') },
    { id: 'settings', label: 'Settings', description: 'Manage laundry settings', onSelect: () => go('/settings') },
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[18vh]" onClick={() => setOpen(false)}>
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-hidden />

      <div
        className="relative w-[calc(100%-2rem)] max-w-lg bg-white rounded-22 shadow-modal overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-200">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#9A9088" aria-hidden>
              <path d="M10 3a7 7 0 1 0 4.2 12.6l4.1 4.1a1 1 0 0 0 1.4-1.4l-4.1-4.1A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
            </svg>
            <Command.Input
              placeholder="Search or jump to…"
              className="flex-1 text-ui text-warm-950 bg-transparent placeholder:text-warm-500 focus:outline-none"
              autoFocus
            />
            <kbd className="text-[11px] font-mono bg-warm-100 border border-warm-300 rounded px-1.5 py-0.5 text-warm-600 leading-none">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-[320px] overflow-y-auto py-1.5">
            <Command.Empty className="py-8 text-center text-ui text-warm-600">
              No matching pages
            </Command.Empty>

            {items.map((item) => (
              <Command.Item
                key={item.id}
                value={item.label}
                onSelect={item.onSelect}
                className="
                  flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                  data-[selected=true]:bg-warm-100
                "
              >
                <div>
                  <p className="text-ui font-medium text-warm-950">{item.label}</p>
                  {item.description && (
                    <p className="text-caption text-warm-600 mt-0.5">{item.description}</p>
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.List>

          <div className="px-4 py-2.5 border-t border-warm-200 flex items-center gap-3 text-micro text-warm-500">
            <span><kbd className="font-mono bg-warm-100 border border-warm-200 rounded px-1">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono bg-warm-100 border border-warm-200 rounded px-1">↵</kbd> open</span>
            <span><kbd className="font-mono bg-warm-100 border border-warm-200 rounded px-1">Esc</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
