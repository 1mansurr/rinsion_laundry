import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { DangerZoneClient } from './DangerZoneClient'

export default async function DangerZonePage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-4 md:p-6">
        <div className="flex items-center gap-1.5 mb-6 text-caption">
          <Link href="/settings" className="text-warm-600 font-semibold hover:text-warm-900">Settings</Link>
          <span className="text-warm-400">/</span>
          <span className="text-error font-bold">Danger Zone</span>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 md:p-6">
      <div className="flex items-center gap-1.5 mb-5 md:mb-6 text-caption">
        <Link href="/settings" className="text-warm-600 font-semibold hover:text-warm-900">Settings</Link>
        <span className="text-warm-400">/</span>
        <span className="text-error font-bold">Danger Zone</span>
      </div>
      <DangerZoneClient laundryName={profile.laundryName} />
    </div>
  )
}
