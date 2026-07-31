import { redirect } from 'next/navigation'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import { getMyJobs } from '@/services/riders/getMyJobs'
import { markNotificationsRead } from '@/services/riders/markNotificationsRead'
import { MyJobsList } from './MyJobsList'

export default async function MyJobsPage() {
  const profile = await getMyRiderProfile()
  if (!profile) redirect('/rider/login')

  const jobs = await getMyJobs()
  await markNotificationsRead()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-h2 font-semibold text-warm-950 mb-6">My jobs</h1>
      <MyJobsList jobs={jobs} />
    </div>
  )
}
