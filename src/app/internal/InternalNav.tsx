'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/internal/system-health',   label: 'System Health' },
  { href: '/internal/subscriptions',   label: 'Subscriptions' },
  { href: '/internal/manual-payments', label: 'Manual Payments' },
  { href: '/internal/sms-health',      label: 'SMS Health' },
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
      {/* /internal and /platform share the same platform_admins clearance,
          so anyone who reached this nav can always reach /platform too. */}
      <div className="pt-2 mt-2 border-t border-warm-100">
        <Link
          href="/platform"
          className="block px-3 py-2 rounded-7 text-ui text-warm-700 hover:bg-warm-100 hover:text-warm-950 transition-colors"
        >
          Platform →
        </Link>
      </div>
    </nav>
  )
}
