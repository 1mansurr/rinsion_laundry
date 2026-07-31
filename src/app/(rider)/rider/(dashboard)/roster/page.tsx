import { redirect } from 'next/navigation'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import { getRoster } from '@/services/riders/getRoster'
import { getPendingRiderInvites } from '@/services/riders/getPendingRiderInvites'
import { RosterList } from './RosterList'

export default async function RosterPage() {
  const profile = await getMyRiderProfile()
  if (!profile) redirect('/rider/login')
  if (profile.role !== 'admin') redirect('/rider/jobs')

  const [riders, invites] = await Promise.all([getRoster(), getPendingRiderInvites()])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-h2 font-semibold text-warm-950 mb-6">Roster</h1>
      <RosterList riders={riders} invites={invites} />
    </div>
  )
}
