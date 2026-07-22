'use client'

import Link from 'next/link'
import { Wordmark } from './ui/Wordmark'

export function TopAppBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  return (
    <div className="min-[720px]:hidden flex-shrink-0 h-[54px] flex items-center gap-3 px-[18px] bg-white border-b border-warm-300">
      <button type="button" onClick={onOpenDrawer} aria-label="Open menu" className="cursor-pointer">
        <Wordmark size="sm" />
      </button>
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/orders"
          aria-label="Search orders"
          className="w-11 h-11 rounded-12 bg-warm-150 border border-warm-300 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#6B6259" aria-hidden>
            <path d="M10 3a7 7 0 1 0 4.2 12.6l4.1 4.1a1 1 0 0 0 1.4-1.4l-4.1-4.1A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
          </svg>
        </Link>
        {/* Decorative for now — no notifications feature/data model exists yet */}
        <span aria-hidden className="w-11 h-11 rounded-12 bg-warm-150 border border-warm-300 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#6B6259" aria-hidden>
            <path d="M12 2a6 6 0 0 0-6 6c0 3.5-1.5 5.5-2.4 6.4A1 1 0 0 0 4.3 16h15.4a1 1 0 0 0 .7-1.6C19.5 13.5 18 11.5 18 8a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 2.8-2H9.2A3 3 0 0 0 12 22Z" />
          </svg>
        </span>
      </div>
    </div>
  )
}
