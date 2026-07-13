'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { TopAppBar } from './TopAppBar'
import { NavDrawer } from './NavDrawer'
import { CreateOrderFab } from './app/CreateOrderFab'
import type { MyProfile } from '@/services/employees/getMyProfile'

const TOP_BAR_ROUTES = ['/dashboard', '/items-and-services', '/settings']

interface Props {
  profile: MyProfile
  /** Dashboard's own lockout screen replaces order-taking entirely — the FAB shouldn't offer it either. */
  subscriptionLocked: boolean
}

export function MobileChrome({ profile, subscriptionLocked }: Props) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const showTopBar = TOP_BAR_ROUTES.includes(pathname)
  const showFab = pathname === '/dashboard' && !subscriptionLocked

  return (
    <>
      {showTopBar && <TopAppBar onOpenDrawer={() => setDrawerOpen(true)} />}
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} profile={profile} />
      {showFab && <CreateOrderFab />}
    </>
  )
}
