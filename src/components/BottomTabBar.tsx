'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { EmployeeRole } from '@/constants/statuses'

interface TabConfig {
  href: string
  label: string
  matchExact?: boolean
}

const ADMIN_TABS: TabConfig[] = [
  { href: '/dashboard', label: 'Home', matchExact: true },
  { href: '/orders',    label: 'Orders' },
  { href: '/customers', label: 'Customers' },
  { href: '/payments',  label: 'Payments' },
  { href: '/settings',  label: 'Settings' },
]

const EMPLOYEE_TABS: TabConfig[] = [
  { href: '/dashboard', label: 'Home', matchExact: true },
  { href: '/orders',    label: 'Orders' },
  { href: '/customers', label: 'Customers' },
  { href: '/payments',  label: 'Payments' },
]

function TabSvg({ label, active }: { label: string; active: boolean }) {
  const c = active ? '#0F3D2E' : '#9A9088'
  if (label === 'Home') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
  )
  if (label === 'Orders') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
  )
  if (label === 'Customers') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.5-8 5.5V21a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-3-3.6-5.5-8-5.5Z"/></svg>
  )
  if (label === 'Payments') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
  )
  if (label === 'Pickup') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2a3 3 0 0 0 6 0h6a3 3 0 0 0 6 0h2v-5l-3-4zm-5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm7-7V9.5h2.5l2 2.5H13z"/></svg>
  )
  if (label === 'Settings') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M19.14 12.94a7.14 7.14 0 0 0 .06-.94 7.14 7.14 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94L2.82 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.4.32.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.23.09.47 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.56ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg>
  )
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
  )
}

export function BottomTabBar({ role }: { role: EmployeeRole }) {
  const pathname = usePathname()
  const tabs = role === 'admin' ? ADMIN_TABS : EMPLOYEE_TABS

  return (
    <nav className="min-[720px]:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-warm-300 flex items-stretch">
      {tabs.map(tab => {
        const active = tab.matchExact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-[3px]"
          >
            <TabSvg label={tab.label} active={active} />
            <span className={`text-[10.5px] font-medium leading-tight ${active ? 'text-brand' : 'text-warm-600'}`}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
