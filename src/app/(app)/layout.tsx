import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { BottomTabBar } from '@/components/BottomTabBar'
import { Banner } from '@/components/ui/Banner'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { createClient } from '@/lib/supabase'

type BannerVariant = 'info' | 'warning' | 'destructive'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getMyProfile()
  if (!profile) {
    // Sign out first to avoid infinite redirect loop for accounts with no employee record.
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/login')
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

  return (
    <ProfileProvider profile={profile}>
      <div className="flex h-dvh bg-canvas">
        <Sidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {bannerConfig && (
            <div className="border-b border-warm-200 px-4 py-2.5">
              <Banner variant={bannerConfig.variant}>{bannerConfig.text}</Banner>
            </div>
          )}
          <main className="flex-1 overflow-auto pb-[calc(60px+env(safe-area-inset-bottom))] min-[720px]:pb-0">
            {children}
          </main>
        </div>
        <BottomTabBar role={profile.role} />
        <CommandPalette />
      </div>
    </ProfileProvider>
  )
}
