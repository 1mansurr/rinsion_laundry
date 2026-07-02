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

  // Check if already set up
  const { count: itemCount } = await supabase
    .from('item_types')
    .select('*', { count: 'exact', head: true })
    .eq('laundry_id', profile.laundryId)
    .eq('is_active', true)

  // Already set up — send to dashboard
  if ((itemCount ?? 0) > 0) redirect('/dashboard')

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
