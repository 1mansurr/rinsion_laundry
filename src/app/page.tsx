import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSignupStatus } from '@/services/laundries/getSignupStatus'
import { LandingPage } from './LandingPage'

export const metadata: Metadata = {
  title: 'Rinsion — Know who took the order, and who took the money',
  description:
    'Rinsion replaces the exercise book for Ghanaian laundries. Every order and payment saved with a name and a time. 14 days free, no card required.',
}

export default async function HomePage() {
  const status = await getSignupStatus()
  if (!status.authenticated) return <LandingPage />

  // Signed up but hasn't finished Add Laundry / Join Laundry yet
  redirect(status.hasEmployee ? '/dashboard' : '/signup/choose')
}
