'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { EmployeeRole } from '@/constants/statuses'

type NavItem = { href: string; label: string } | null

const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard',          label: 'Dashboard' },
  { href: '/orders',             label: 'Orders' },
  { href: '/customers',          label: 'Customers' },
  { href: '/payments',           label: 'Payments' },
  { href: '/pickup',             label: 'Pickup' },
  null,
  { href: '/employees',          label: 'Team' },
  { href: '/items-and-services', label: 'Items & Services' },
  { href: '/reports',            label: 'Reports' },
  { href: '/settings',           label: 'Settings' },
]

const EMPLOYEE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/orders',    label: 'Orders' },
  { href: '/customers', label: 'Customers' },
  { href: '/payments',  label: 'Payments' },
  { href: '/pickup',    label: 'Pickup' },
]

export function SidebarNav({ role }: { role: EmployeeRole }) {
  const pathname = usePathname()
  const nav = role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV

  return (
    <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
      {nav.map((item, i) => {
        if (!item) {
          return <div key={`sep-${i}`} className="my-1.5 border-t border-warm-200" />
        }
        const { href, label } = item
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center px-3 py-2 rounded-7 text-ui-sm font-medium transition-colors ${
              active
                ? 'bg-brand text-[#FAF8F5]'
                : 'text-warm-800 hover:bg-warm-100 hover:text-warm-950'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
