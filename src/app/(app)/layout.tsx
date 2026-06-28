import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { createClient } from '@/lib/supabase'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getMyProfile()
  if (!profile) {
    // Sign out first so the middleware doesn't redirect back to /dashboard,
    // creating an infinite loop for accounts with no employee record (e.g. internal admins).
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const subscription = await getActiveSubscription(profile.laundryId)

  const bannerConfig: { text: string; className: string } | null = (() => {
    if (!subscription) return { text: 'No active subscription. Contact Rinsion to activate your trial.', className: 'bg-yellow-50 border-yellow-200 text-yellow-800' }
    if (subscription.status === 'locked') return { text: 'Your subscription has expired. All operations are paused. Please renew to continue.', className: 'bg-red-50 border-red-200 text-red-800' }
    if (subscription.status === 'hard_block') return { text: `Account in read-only mode. Renew now to restore operations. ${subscription.daysLeft === 0 ? 'Expires today.' : `${subscription.daysLeft}d left.`}`, className: 'bg-orange-50 border-orange-200 text-orange-800' }
    if (subscription.status === 'soft_block') return { text: `Subscription overdue — ${subscription.daysLeft === 0 ? 'expires today' : `${subscription.daysLeft}d grace remaining`}. Renew to avoid disruption.`, className: 'bg-yellow-50 border-yellow-200 text-yellow-800' }
    if (subscription.status === 'trialing' && subscription.daysLeft <= 3) return { text: `Trial ends in ${subscription.daysLeft} day${subscription.daysLeft !== 1 ? 's' : ''}. Contact Rinsion to choose a plan.`, className: 'bg-blue-50 border-blue-200 text-blue-800' }
    return null
  })()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {bannerConfig && (
          <div className={`border-b px-4 py-2 text-xs font-medium ${bannerConfig.className}`}>
            {bannerConfig.text}
          </div>
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
