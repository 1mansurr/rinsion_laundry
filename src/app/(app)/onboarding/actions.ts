'use server'

import { createClient } from '@/lib/supabase'
import { getVerifiedUserId } from '@/lib/auth'

export async function updateLaundrySetup(
  laundryId: string,
  laundryName: string,
  branchId: string,
  branchName: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createClient()

  const [laundryRes, branchRes] = await Promise.all([
    supabase.from('laundries').update({ name: laundryName.trim() }).eq('id', laundryId),
    branchId && branchName.trim()
      ? supabase.from('branches').update({ name: branchName.trim() }).eq('id', branchId)
      : Promise.resolve({ error: null }),
  ])

  if (laundryRes.error) return { success: false, error: laundryRes.error.message }
  if ('error' in branchRes && branchRes.error) return { success: false, error: branchRes.error.message }

  return { success: true }
}

export async function completeOnboarding(): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('laundry_id')
    .eq('auth_user_id', userId)
    .single()
  if (!emp) return { success: false, error: 'Employee not found.' }

  const { error } = await supabase
    .from('settings')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('laundry_id', emp.laundry_id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
