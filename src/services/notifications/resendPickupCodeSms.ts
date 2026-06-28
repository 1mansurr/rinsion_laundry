'use server'

import { createClient } from '@/lib/supabase'
import { sendSms } from './sendSms'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Manual resend of the pickup code SMS. Triggered from the order detail screen.
 * Counts toward the laundry's SMS quota just like any other customer-facing message.
 *
 * Spec reference: Rinsion_Technical_Overview.md §11 → PICKUP_CODE_RESEND trigger
 */
export async function resendPickupCodeSms(orderId: string): Promise<ServiceResult<null>> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, order_number, pickup_code, laundry_id, customer_id,
      customers(phone),
      laundries(name)
    `)
    .eq('id', orderId)
    .single()

  if (!order) return { success: false, error: 'Order not found.' }

  const phone = (order.customers as unknown as { phone: string } | null)?.phone
  const laundryName = (order.laundries as unknown as { name: string } | null)?.name ?? 'Your laundry'

  if (!phone) return { success: false, error: 'Customer has no phone number on file.' }

  // TODO: confirm message wording after interviews
  const message = `${laundryName}: Pickup code reminder for order ${order.order_number}. Your code is: ${order.pickup_code}. Show this when collecting your items.`

  const result = await sendSms({
    laundryId: order.laundry_id,
    orderId: order.id,
    customerId: order.customer_id,
    phone,
    message,
    triggerEvent: 'PICKUP_CODE_RESEND',
  })

  return result.success
    ? { success: true, data: null }
    : { success: false, error: 'SMS failed to send. Check your mNotify configuration.' }
}
