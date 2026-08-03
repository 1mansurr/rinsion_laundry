'use client'

import { usePathname } from 'next/navigation'
import { TopAppBar } from './TopAppBar'
import { CreateOrderFab } from './app/CreateOrderFab'

const TOP_BAR_ROUTES = ['/dashboard', '/items-and-services', '/settings']

interface Props {
  /** Dashboard's own lockout screen replaces order-taking entirely — the FAB shouldn't offer it either. */
  subscriptionLocked: boolean
}

export function MobileChrome({ subscriptionLocked }: Props) {
  const pathname = usePathname()

  const showTopBar = TOP_BAR_ROUTES.includes(pathname)
  const showFab = pathname === '/dashboard' && !subscriptionLocked

  return (
    <>
      {showTopBar && <TopAppBar />}
      {showFab && <CreateOrderFab />}
    </>
  )
}
