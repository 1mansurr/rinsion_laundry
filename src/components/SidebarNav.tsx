'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { EmployeeRole } from '@/constants/statuses'

type NavItem = { href: string; label: string } | null

// Pickup Requests (Product B — docs/customer-portal+rider.md) only shows up
// for laundries with settings.allow_customer_submissions on. Hidden by
// default, deliberately not tied to the existing /pickup route (staff walk-in
// collection verification, unrelated) — see the naming note in
// 20240037000000_customer_accounts_and_logistics.sql.
function buildAdminNav(showPickupRequests: boolean): NavItem[] {
  const nav: NavItem[] = [
    { href: '/dashboard',          label: 'Dashboard' },
    { href: '/orders',             label: 'Orders' },
    { href: '/customers',          label: 'Customers' },
    { href: '/payments',           label: 'Payments' },
  ]
  if (showPickupRequests) nav.push({ href: '/pickup-requests', label: 'Pickup Requests' })
  nav.push(
    null,
    { href: '/employees',          label: 'Team' },
    { href: '/items-and-services', label: 'Items & Services' },
    { href: '/reports',            label: 'Reports' },
    { href: '/settings',           label: 'Settings' },
  )
  return nav
}

function buildEmployeeNav(showPickupRequests: boolean): NavItem[] {
  const nav: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/orders',    label: 'Orders' },
    { href: '/customers', label: 'Customers' },
    { href: '/payments',  label: 'Payments' },
  ]
  if (showPickupRequests) nav.push({ href: '/pickup-requests', label: 'Pickup Requests' })
  return nav
}

export function SidebarNav({ role, showPickupRequests = false }: { role: EmployeeRole; showPickupRequests?: boolean }) {
  const pathname = usePathname()
  const nav = role === 'admin' ? buildAdminNav(showPickupRequests) : buildEmployeeNav(showPickupRequests)

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
            className={`flex items-center px-3 py-2 rounded-12 text-ui-sm font-medium transition-colors ${
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
