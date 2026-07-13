'use client'

import { usePathname } from 'next/navigation'
import { isTabBarHiddenRoute } from '@/lib/mobileChromeRoutes'

export function MainScrollArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reserveTabBarSpace = !isTabBarHiddenRoute(pathname)

  return (
    <main className={`flex-1 overflow-auto min-[720px]:pb-0 ${reserveTabBarSpace ? 'pb-[calc(60px+env(safe-area-inset-bottom))]' : ''}`}>
      {children}
    </main>
  )
}
