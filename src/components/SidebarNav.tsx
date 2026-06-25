'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { EmployeeRole } from '@/constants/statuses'

const ADMIN_NAV = [
  { href: '/dashboard',          label: 'Dashboard' },
  { href: '/customers',          label: 'Customers' },
  { href: '/orders',             label: 'Orders' },
  { href: '/payments',           label: 'Payments' },
  { href: '/employees',          label: 'Employees' },
  { href: '/items-and-services', label: 'Items & Services' },
  { href: '/reports',            label: 'Reports' },
  { href: '/settings',           label: 'Settings' },
]

const EMPLOYEE_NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
  { href: '/orders',    label: 'Orders' },
  { href: '/payments',  label: 'Payments' },
]

export function SidebarNav({ role }: { role: EmployeeRole }) {
  const pathname = usePathname()
  const nav = role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV

  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5">
      {nav.map(({ href, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-gray-900 text-white font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
