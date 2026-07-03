import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const profile = await getMyProfile()
  if (!profile) return null

  // Only admins go through onboarding
  if (profile.role !== 'admin') redirect('/dashboard')

  const supabase = createClient()

  // Check if already set up — item_types alone isn't a reliable signal since
  // every laundry-creation path inserts default item types immediately.
  const { data: settingsRow } = await supabase
    .from('settings')
    .select('onboarding_completed_at')
    .eq('laundry_id', profile.laundryId)
    .single()

  if (settingsRow?.onboarding_completed_at) redirect('/dashboard')

  // Fetch current laundry + branch names for pre-filling Step 1
  const [{ data: laundry }, { data: branches }] = await Promise.all([
    supabase.from('laundries').select('id, name').eq('id', profile.laundryId).single(),
    supabase.from('branches').select('id, name').eq('laundry_id', profile.laundryId).limit(1).single(),
  ])

  return (
    <OnboardingClient
      laundryId={profile.laundryId}
      defaultLaundryName={laundry?.name ?? ''}
      defaultBranchId={(branches as unknown as { id: string } | null)?.id ?? ''}
      defaultBranchName={(branches as unknown as { name: string } | null)?.name ?? ''}
    />
  )
}
