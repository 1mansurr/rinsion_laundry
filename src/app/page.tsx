import { redirect } from 'next/navigation'
import { getSignupStatus } from '@/services/laundries/getSignupStatus'

export default async function HomePage() {
  const status = await getSignupStatus()
  if (!status.authenticated) redirect('/login')

  // Signed up but hasn't finished Add Laundry / Join Laundry yet
  redirect(status.hasEmployee ? '/dashboard' : '/signup/choose')
}
