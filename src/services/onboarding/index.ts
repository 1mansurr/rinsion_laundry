'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import type { ServiceResult } from '@/types/serviceResult'

export interface OnboardingPageData {
  alreadyCompleted: boolean
  laundryName: string
  branchId: string
  branchName: string
}

/**
 * Data needed to render the first-run onboarding wizard: whether it's already
 * been completed (redirect guard), plus current laundry/branch names to
 * pre-fill Step 1. item_types alone isn't a reliable "already set up" signal
 * since every laundry-creation path inserts default item types immediately.
 */
export async function getOnboardingPageData(laundryId: string): Promise<OnboardingPageData> {
  const supabase = createClient()

  const [{ data: settingsRow }, { data: laundry }, { data: branch }] = await Promise.all([
    supabase.from('settings').select('onboarding_completed_at').eq('laundry_id', laundryId).single(),
    supabase.from('laundries').select('name').eq('id', laundryId).single(),
    supabase.from('branches').select('id, name').eq('laundry_id', laundryId).limit(1).single(),
  ])

  return {
    alreadyCompleted: !!settingsRow?.onboarding_completed_at,
    laundryName: laundry?.name ?? '',
    branchId: branch?.id ?? '',
    branchName: branch?.name ?? '',
  }
}

export async function updateLaundrySetup(
  laundryId: string,
  laundryName: string,
  branchId: string,
  branchName: string,
): Promise<ServiceResult<null>> {
  const supabase = createClient()

  const [laundryRes, branchRes] = await Promise.all([
    supabase.from('laundries').update({ name: laundryName.trim() }).eq('id', laundryId),
    branchId && branchName.trim()
      ? supabase.from('branches').update({ name: branchName.trim() }).eq('id', branchId)
      : Promise.resolve({ error: null }),
  ])

  if (laundryRes.error) return { success: false, error: laundryRes.error.message }
  if ('error' in branchRes && branchRes.error) return { success: false, error: branchRes.error.message }

  return { success: true, data: null }
}

export async function completeOnboarding(): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('settings')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('laundry_id', profile.laundryId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}
