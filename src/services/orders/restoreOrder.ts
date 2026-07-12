'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function restoreOrder(orderId: string): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('orders')
    .update({ deleted_at: null })
    .eq('id', orderId)
    .eq('laundry_id', profile.laundryId)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'This pickup code is now used by another order.' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/orders')
  revalidatePath('/settings/recycle-bin')
  return { success: true, data: null }
}
