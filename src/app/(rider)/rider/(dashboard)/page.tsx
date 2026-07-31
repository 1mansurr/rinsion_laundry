import { redirect } from 'next/navigation'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'

export default async function RiderHomePage() {
  const profile = await getMyRiderProfile()
  if (!profile) redirect('/rider/login')
  redirect(profile.role === 'admin' ? '/rider/queue' : '/rider/jobs')
}
