'use server'

import { createClient } from '@/lib/supabase'
import { getMyCustomerProfile } from '@/services/customerAuth/getMyCustomerProfile'
import { encryptField } from '@/lib/crypto'
import type { ServiceResult } from '@/types/serviceResult'

export interface RequestPickupInput {
  orderId: string
  /**
   * Only passed when the customer actually edited the pre-filled location on
   * the Request Pickup screen. Omitted/undefined means "use whatever's
   * already on the order" (itself snapshotted from the customer's saved
   * default at order-creation time — see create_customer_order_tx).
   */
  location?: string
  /**
   * Distinguishes "just for this pickup" (false — orders.location only)
   * from "my location has changed" (true — also updates customers.location,
   * so it becomes the default for future orders). Ignored if location isn't
   * provided.
   */
  updateCustomerDefault?: boolean
  notes?: string
}

/**
 * Customer-side "Request Pickup" action (docs/customer-portal+rider.md §3) —
 * shown on the invoice once the customer has reviewed it. Goes to the
 * laundry's approval queue, not to any rider — create_pickup_request_tx
 * enforces that the order is still 'draft' and belongs to this customer.
 */
export async function requestPickup(input: RequestPickupInput): Promise<ServiceResult<{ pickupRequestId: string }>> {
  const profile = await getMyCustomerProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const supabase = createClient()
  const { data, error } = await supabase.rpc('create_pickup_request_tx', {
    p_customer_account_id: profile.id,
    p_order_id: input.orderId,
    p_location: input.location?.trim() ? encryptField(input.location.trim()) : null,
    p_update_customer_default: input.updateCustomerDefault ?? false,
    p_pickup_notes: input.notes?.trim() || null,
  })

  if (error) return { success: false, error: error.message }
  return { success: true, data: { pickupRequestId: data as string } }
}
