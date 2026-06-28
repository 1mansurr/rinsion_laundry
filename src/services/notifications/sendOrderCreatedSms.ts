'use server'

import { createClient } from '@/lib/supabase'
import { sendSms } from './sendSms'

/**
 * Sends the order-created SMS to the customer with their order ID and pickup code.
 * Triggered immediately after order creation.
 *
 * TODO: confirm message wording after laundry owner interviews.
 *
 * Spec reference: Rinsion_Technical_Overview.md §11 → ORDER_CREATED trigger
 */
export async function sendOrderCreatedSms(orderId: string): Promise<void> {
  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, order_number, pickup_code, pickup_date, laundry_id, customer_id,
      customers(phone),
      laundries(name)
    `)
    .eq('id', orderId)
    .single()

  if (!order) return

  const phone = (order.customers as unknown as { phone: string } | null)?.phone
  const laundryName = (order.laundries as unknown as { name: string } | null)?.name ?? 'Your laundry'

  if (!phone) return

  // TODO: confirm message wording after interviews
  const pickupLine = order.pickup_date ? ` Expected: ${order.pickup_date}.` : ''
  const message = `${laundryName}: Order ${order.order_number} received. Pickup code: ${order.pickup_code}.${pickupLine} Show this code when collecting your items.`

  await sendSms({
    laundryId: order.laundry_id,
    orderId: order.id,
    customerId: order.customer_id,
    phone,
    message,
    triggerEvent: 'ORDER_CREATED',
  })
}
