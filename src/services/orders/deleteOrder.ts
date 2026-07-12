'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function deleteOrder(orderId: string): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('laundry_id', profile.laundryId)
    .single()

  if (!order) return { success: false, error: 'Order not found.' }
  if (order.status !== 'cancelled' && order.status !== 'collected') {
    return { success: false, error: 'Only cancelled or collected orders can be deleted.' }
  }

  const { error } = await supabase
    .from('orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('laundry_id', profile.laundryId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/orders')
  return { success: true, data: null }
}
