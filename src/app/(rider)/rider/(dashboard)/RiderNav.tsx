'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NotificationBadge } from './NotificationBadge'
import type { RiderRole } from '@/constants/statuses'

interface Props {
  role: RiderRole
  riderId: string
  unreadCount: number
}

export function RiderNav({ role, riderId, unreadCount }: Props) {
  const pathname = usePathname()
  const items = role === 'admin'
    ? [{ href: '/rider/queue', label: 'Job queue' }, { href: '/rider/roster', label: 'Roster' }]
    : [{ href: '/rider/jobs', label: 'My jobs' }]

  return (
    <nav className="flex items-center gap-1">
      {items.map(({ href, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-ui font-medium transition-colors ${
              active ? 'bg-brand text-[#FAF8F5]' : 'text-warm-700 hover:bg-warm-100'
            }`}
          >
            {label}
            {role === 'rider' && href === '/rider/jobs' && (
              <NotificationBadge riderId={riderId} initialCount={unreadCount} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
