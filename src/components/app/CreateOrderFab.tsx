'use client'

import Link from 'next/link'

export function CreateOrderFab() {
  return (
    <Link
      href="/orders/new"
      aria-label="Create order"
      className="min-[720px]:hidden fixed right-[18px] bottom-[92px] z-30 w-14 h-14 rounded-full bg-brand shadow-[0_10px_24px_rgba(15,61,46,0.34)] flex items-center justify-center"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#FAF8F5" aria-hidden>
        <path d="M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5Z" />
      </svg>
    </Link>
  )
}
