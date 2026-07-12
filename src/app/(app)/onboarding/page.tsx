import { redirect } from 'next/navigation'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getOnboardingPageData } from '@/services/onboarding'
import { getItemTypes } from '@/services/items/getItemTypes'
import { getServices } from '@/services/services/getServices'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const profile = await getMyProfile()
  if (!profile) return null

  // Only admins go through onboarding
  if (profile.role !== 'admin') redirect('/dashboard')

  const data = await getOnboardingPageData(profile.laundryId)
  if (data.alreadyCompleted) redirect('/dashboard')

  // Laundry creation already seeds the default catalog (see createLaundrySelfServe) —
  // the wizard selects from and prices those existing rows rather than creating
  // new ones, so it doesn't double up on item types/services.
  const [itemTypes, services] = await Promise.all([
    getItemTypes(profile.laundryId),
    getServices(profile.laundryId),
  ])

  return (
    <OnboardingClient
      laundryId={profile.laundryId}
      defaultLaundryName={data.laundryName}
      defaultBranchId={data.branchId}
      defaultBranchName={data.branchName}
      itemTypes={itemTypes.map(i => ({ id: i.id, name: i.name }))}
      services={services.map(s => ({ id: s.id, name: s.name }))}
    />
  )
}
