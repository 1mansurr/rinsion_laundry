'use server'

import { createClient } from '@/lib/supabase'
import { getVerifiedUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function createOrderNote(
  orderId: string,
  note: string,
): Promise<ServiceResult<null>> {
  const trimmed = note.trim()
  if (!trimmed) return { success: false, error: 'Note cannot be empty.' }

  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .single()
  if (!emp) return { success: false, error: 'Employee not found.' }

  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('laundry_id', emp.laundry_id)
    .is('deleted_at', null)
    .single()
  if (!order) return { success: false, error: 'Order not found.' }

  const { error } = await supabase.from('order_notes').insert({
    order_id: orderId,
    note: trimmed,
    created_by_type: 'employee',
    created_by_id: emp.id,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath(`/orders/${orderId}`)
  return { success: true, data: null }
}
