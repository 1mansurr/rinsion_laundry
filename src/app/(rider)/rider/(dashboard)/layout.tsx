import { redirect } from 'next/navigation'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import { getUnreadNotificationCount } from '@/services/riders/getUnreadNotificationCount'
import { riderSignOut } from '../login/actions'
import { RiderNav } from './RiderNav'
import { Wordmark } from '@/components/ui/Wordmark'

export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  const profile = await getMyRiderProfile()
  // Middleware already guarantees a session reaches here — a missing rider
  // profile means this auth.users account isn't a rider (e.g. an employee
  // or customer session, or a not-yet-accepted invite).
  if (!profile) redirect('/rider/login')

  const unreadCount = profile.role === 'rider' ? await getUnreadNotificationCount() : 0

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-white border-b border-warm-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Wordmark size="sm" />
          <RiderNav role={profile.role} riderId={profile.id} unreadCount={unreadCount} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-caption text-warm-500 hidden sm:inline">{profile.riderCompanyName}</span>
          <form action={riderSignOut}>
            <button type="submit" className="text-caption text-warm-500 hover:text-warm-800 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
