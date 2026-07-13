'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/login/actions'
import { Wordmark } from './ui/Wordmark'
import type { MyProfile } from '@/services/employees/getMyProfile'

interface NavItem {
  href: string
  label: string
  icon: string
}

const ICONS = {
  dashboard: 'M11.5 3.2a1 1 0 0 1 1 0l8 5.2A1 1 0 0 1 21 9.2V20a1 1 0 0 1-1 1h-5v-6h-4v6H6a1 1 0 0 1-1-1V9.2a1 1 0 0 1 .5-.8l6-3.2Z',
  orders: 'M8 16h8v2H8zm0-4h8v2H8zm6-10H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
  customers: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.5-8 5.5V21a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-3-3.6-5.5-8-5.5Z',
  payments: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm2 3v9h14V9H5Zm2 5a1 1 0 0 0 0 2h4a1 1 0 1 0 0-2H7Z',
  team: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z',
  itemsServices: 'M12.4 2.4 21 11l-9.6 9.6a2 2 0 0 1-2.8 0L3 15V3h12l-.6-.6ZM7 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  reports: 'M5 21V10h3v11H5Zm6 0V3h3v18h-3Zm6 0v-7h3v7h-3Z',
  settings: 'M19.14 12.94a7.14 7.14 0 0 0 .06-.94 7.14 7.14 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94L2.82 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.4.32.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.23.09.47 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.56ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
}

const ADMIN_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: ICONS.dashboard },
  { href: '/orders', label: 'Orders', icon: ICONS.orders },
  { href: '/customers', label: 'Customers', icon: ICONS.customers },
  { href: '/payments', label: 'Payments', icon: ICONS.payments },
  { href: '/employees', label: 'Team', icon: ICONS.team },
  { href: '/items-and-services', label: 'Items & Services', icon: ICONS.itemsServices },
  { href: '/reports', label: 'Reports', icon: ICONS.reports },
  { href: '/settings', label: 'Settings', icon: ICONS.settings },
]

const EMPLOYEE_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: ICONS.dashboard },
  { href: '/orders', label: 'Orders', icon: ICONS.orders },
  { href: '/customers', label: 'Customers', icon: ICONS.customers },
  { href: '/payments', label: 'Payments', icon: ICONS.payments },
]

interface Props {
  open: boolean
  onClose: () => void
  profile: MyProfile
}

export function NavDrawer({ open, onClose, profile }: Props) {
  const pathname = usePathname()
  if (!open) return null

  const items = profile.role === 'admin' ? ADMIN_ITEMS : EMPLOYEE_ITEMS
  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase()

  return (
    <div className="min-[720px]:hidden fixed inset-0 z-[60] flex">
      <div onClick={onClose} className="absolute inset-0 bg-black/45" />

      <div className="relative w-[272px] max-w-[82%] h-full bg-canvas shadow-[12px_0_32px_rgba(16,16,16,0.20)] flex flex-col overflow-y-auto animate-drawer-in">
        <div className="px-5 pt-[22px] pb-[18px] border-b border-warm-300">
          <Wordmark size="md" className="mb-3" />
          <p className="text-ui font-semibold text-warm-950">{profile.laundryName}</p>
          <p className="text-caption text-warm-700 mt-0.5 capitalize">{profile.role}</p>
        </div>

        <nav className="flex-1 p-2.5">
          {items.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-[13px] px-3 py-[13px] rounded-10 mb-0.5 transition-colors ${active ? 'bg-brand-tint' : 'hover:bg-warm-150'}`}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill={active ? '#0F3D2E' : '#43403B'} aria-hidden>
                  <path d={item.icon} />
                </svg>
                <span className={`text-ui ${active ? 'font-bold text-brand' : 'font-medium text-warm-900'}`}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-5 border-t border-warm-300">
          <div className="flex items-center gap-[11px] px-1 pb-[14px]">
            <span className="w-[34px] h-[34px] rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-label flex-shrink-0">
              {initials}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-label font-semibold text-warm-950 truncate">{profile.firstName} {profile.lastName}</p>
              <p className="text-micro text-warm-600 capitalize">{profile.role}</p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-[13px] px-3 py-3 rounded-10 text-ui font-semibold text-error hover:bg-error-bg transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#B0413A" aria-hidden>
                <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5v-2H5V5h5V3Zm9.7 8.3-4-4a1 1 0 0 0-1.4 1.4L16.6 11H9v2h7.6l-2.3 2.3a1 1 0 0 0 1.4 1.4l4-4a1 1 0 0 0 0-1.4Z" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
