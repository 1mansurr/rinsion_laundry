'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function restoreCustomer(customerId: string): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('customers')
    .update({ deleted_at: null })
    .eq('id', customerId)
    .eq('laundry_id', profile.laundryId)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'This phone number is now used by another customer.' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/customers')
  revalidatePath('/settings/recycle-bin')
  return { success: true, data: null }
}
