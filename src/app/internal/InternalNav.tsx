'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/internal/system-health',   label: 'System Health' },
  { href: '/internal/subscriptions',   label: 'Subscriptions' },
  { href: '/internal/manual-payments', label: 'Manual Payments' },
  { href: '/internal/sms-health',      label: 'SMS Health' },
  { href: '/internal/laundries',       label: 'Laundries' },
  { href: '/internal/alerts',          label: 'Alerts' },
]

export function InternalNav() {
  const pathname = usePathname()
  return (
    <nav className="px-3 pb-4 space-y-0.5">
      {NAV.map(({ href, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`block px-3 py-2 rounded-7 text-ui transition-colors ${
              active
                ? 'bg-brand text-[#FAF8F5] font-medium'
                : 'text-warm-700 hover:bg-warm-100 hover:text-warm-950'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
