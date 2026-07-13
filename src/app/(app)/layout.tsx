import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { BottomTabBar } from '@/components/BottomTabBar'
import { MobileChrome } from '@/components/MobileChrome'
import { MainScrollArea } from '@/components/MainScrollArea'
import { Banner } from '@/components/ui/Banner'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { UnauthorizedNotice } from '@/components/app/UnauthorizedNotice'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'

type BannerVariant = 'info' | 'warning' | 'destructive'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getMyProfile()
  if (!profile) {
    // Middleware already guarantees an authenticated session reaches this layout,
    // so a missing profile means signup was interrupted before an employee row
    // was created (e.g. user closed the tab before choosing join/create laundry).
    // Send them back to finish that flow instead of /login, which would just
    // bounce back here via middleware's authenticated-user redirect (infinite loop).
    redirect('/signup/choose')
  }

  const subscription = await getActiveSubscription(profile.laundryId)

  const bannerConfig: { text: string; variant: BannerVariant } | null = (() => {
    if (!subscription) return { text: 'No active subscription. Contact Rinsion to activate your trial.', variant: 'warning' }
    if (subscription.status === 'locked') return { text: 'Your subscription has expired. All operations are paused. Please renew to continue.', variant: 'destructive' }
    if (subscription.status === 'hard_block') return { text: `Account in read-only mode. Renew now to restore operations. ${subscription.daysLeft === 0 ? 'Expires today.' : `${subscription.daysLeft}d left.`}`, variant: 'warning' }
    if (subscription.status === 'soft_block') return { text: `Subscription overdue — ${subscription.daysLeft === 0 ? 'expires today' : `${subscription.daysLeft}d grace remaining`}. Renew to avoid disruption.`, variant: 'warning' }
    if (subscription.status === 'trialing' && subscription.daysLeft <= 3) return { text: `Trial ends in ${subscription.daysLeft} day${subscription.daysLeft !== 1 ? 's' : ''}. Contact Rinsion to choose a plan.`, variant: 'info' }
    return null
  })()

  const subscriptionLocked = subscription?.status === 'locked' || subscription?.status === 'hard_block'

  return (
    <ProfileProvider profile={profile}>
      <div className="flex h-dvh bg-canvas">
        <Sidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MobileChrome profile={profile} subscriptionLocked={subscriptionLocked} />
          <Suspense fallback={null}>
            <UnauthorizedNotice />
          </Suspense>
          {bannerConfig && (
            <div className="border-b border-warm-200 px-4 py-2.5">
              <Banner variant={bannerConfig.variant}>{bannerConfig.text}</Banner>
            </div>
          )}
          <MainScrollArea>{children}</MainScrollArea>
        </div>
        <BottomTabBar role={profile.role} />
        <CommandPalette />
      </div>
    </ProfileProvider>
  )
}
