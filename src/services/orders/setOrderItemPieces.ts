'use server'

import { createClient } from '@/lib/supabase'
import { getVerifiedUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export interface OrderItemPieceInput {
  itemTypeId: string
  quantity: number
}

/**
 * Replaces the full contents breakdown for a per_kg order line in one call —
 * simpler and safer than diffing against the previous rows for a list this
 * small and infrequently edited.
 */
export async function setOrderItemPieces(
  orderId: string,
  orderItemId: string,
  pieces: OrderItemPieceInput[]
): Promise<ServiceResult<null>> {
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

  const { data: orderItem } = await supabase
    .from('order_items')
    .select('id')
    .eq('id', orderItemId)
    .eq('order_id', orderId)
    .single()
  if (!orderItem) return { success: false, error: 'Order item not found.' }

  const { error: delError } = await supabase
    .from('order_item_pieces')
    .delete()
    .eq('order_item_id', orderItemId)
  if (delError) return { success: false, error: delError.message }

  const validPieces = pieces.filter(p => p.itemTypeId && p.quantity > 0)
  if (validPieces.length > 0) {
    const { error: insError } = await supabase
      .from('order_item_pieces')
      .insert(validPieces.map(p => ({
        order_item_id: orderItemId,
        item_type_id: p.itemTypeId,
        quantity: p.quantity,
      })))
    if (insError) return { success: false, error: insError.message }
  }

  revalidatePath(`/orders/${orderId}`)
  return { success: true, data: null }
}
