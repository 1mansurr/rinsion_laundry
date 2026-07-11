import { redirect } from 'next/navigation'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getOnboardingPageData } from '@/services/onboarding'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const profile = await getMyProfile()
  if (!profile) return null

  // Only admins go through onboarding
  if (profile.role !== 'admin') redirect('/dashboard')

  const data = await getOnboardingPageData(profile.laundryId)
  if (data.alreadyCompleted) redirect('/dashboard')

  return (
    <OnboardingClient
      laundryId={profile.laundryId}
      defaultLaundryName={data.laundryName}
      defaultBranchId={data.branchId}
      defaultBranchName={data.branchName}
    />
  )
}
