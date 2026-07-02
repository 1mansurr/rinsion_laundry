'use server'

import { createClient } from '@/lib/supabase'

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
