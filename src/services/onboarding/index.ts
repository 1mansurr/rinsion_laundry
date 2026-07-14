'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { ROLES } from '@/constants/statuses'
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
  // Onboarding only runs for an admin whose employee row (and laundry/branch)
  // already exist — page.tsx gates rendering on getMyProfile() + role==='admin'
  // before the client component that calls this action ever mounts. But this
  // is a Server Action, reachable directly as a POST regardless of what the
  // page rendered, and laundryId/branchId are client-supplied — without this
  // check any authenticated employee could rename an arbitrary laundry/branch
  // by guessing/enumerating ids.
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  if (laundryId !== check.data.laundryId) return { success: false, error: 'Not authorized for this laundry.' }

  const supabase = createClient()

  const [laundryRes, branchRes] = await Promise.all([
    supabase.from('laundries').update({ name: laundryName.trim() }).eq('id', laundryId),
    branchId && branchName.trim()
      ? supabase.from('branches').update({ name: branchName.trim() }).eq('id', branchId).eq('laundry_id', laundryId)
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
