'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isTabBarHiddenRoute } from '@/lib/mobileChromeRoutes'

interface TabConfig {
  href: string
  label: string
  matchExact?: boolean
}

// Every other section (Customers, Payments, Team, Items & Services, Reports,
// Settings, Pickup Requests, Support, Legal) lives under Account now instead
// of its own tab — see src/app/(app)/account/page.tsx.
const TABS: TabConfig[] = [
  { href: '/dashboard', label: 'Home', matchExact: true },
  { href: '/orders',    label: 'Orders' },
  { href: '/account',   label: 'Account' },
]

function TabSvg({ label, active }: { label: string; active: boolean }) {
  const c = active ? '#0F3D2E' : '#9A9088'
  if (label === 'Home') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
  )
  if (label === 'Orders') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
  )
  // Account
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={c}><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.5-8 5.5V21a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-3-3.6-5.5-8-5.5Z"/></svg>
  )
}

export function BottomTabBar() {
  const pathname = usePathname()

  if (isTabBarHiddenRoute(pathname)) return null

  return (
    <nav className="min-[720px]:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-warm-300 flex items-stretch pb-[env(safe-area-inset-bottom)]">
      {TABS.map(tab => {
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
