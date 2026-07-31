import { redirect } from 'next/navigation'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import { getRiderCompanyJobQueue } from '@/services/logistics/getRiderCompanyJobQueue'
import { getRoster } from '@/services/riders/getRoster'
import { JobQueueList } from './JobQueueList'

export default async function QueuePage() {
  const profile = await getMyRiderProfile()
  if (!profile) redirect('/rider/login')
  if (profile.role !== 'admin') redirect('/rider/jobs')

  const [jobs, riders] = await Promise.all([getRiderCompanyJobQueue(), getRoster()])
  const availableRiders = riders.filter(r => r.role === 'rider' && r.isActive)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-h2 font-semibold text-warm-950 mb-6">Job queue</h1>
      <JobQueueList jobs={jobs} riders={availableRiders} />
    </div>
  )
}
