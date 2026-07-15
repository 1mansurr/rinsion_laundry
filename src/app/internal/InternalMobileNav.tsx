'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Wordmark } from '@/components/ui/Wordmark'
import { InternalNav } from './InternalNav'

/**
 * Mobile counterpart to the desktop <aside> in layout.tsx (hidden below the
 * min-[720px] breakpoint, same as components/Sidebar.tsx + NavDrawer.tsx in
 * the main app) — a top bar that opens an overlay drawer instead of a
 * permanently-open sidebar squeezed next to the content.
 */
export function InternalMobileNav({ adminLabel }: { adminLabel: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="min-[720px]:hidden flex-shrink-0 h-[54px] flex items-center px-[18px] bg-white border-b border-warm-200">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="flex items-center gap-2 cursor-pointer">
          <Wordmark size="sm" />
          <span className="text-caption font-semibold text-warm-700">Internal</span>
        </button>
      </div>

      {open && (
        <div className="min-[720px]:hidden fixed inset-0 z-[60] flex">
          <div onClick={() => setOpen(false)} className="absolute inset-0 bg-black/45" />

          <div className="relative w-[272px] max-w-[82%] h-full bg-canvas shadow-[12px_0_32px_rgba(16,16,16,0.20)] flex flex-col overflow-y-auto animate-drawer-in">
            <div className="px-4 py-5 border-b border-warm-100">
              <Wordmark size="sm" />
              <p className="text-micro text-warm-500 mt-0.5 truncate">{adminLabel}</p>
            </div>

            <div className="flex-1 py-3" onClick={() => setOpen(false)}>
              <InternalNav />
            </div>

            <div className="px-4 py-4 border-t border-warm-100">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="text-caption text-warm-500 hover:text-warm-800 transition-colors"
              >
                ← Back to app
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
