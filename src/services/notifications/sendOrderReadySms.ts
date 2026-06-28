'use server'

import { createClient } from '@/lib/supabase'
import { sendSms } from './sendSms'

/**
 * Sends the order-ready SMS to the customer when their order status moves to Ready.
 *
 * TODO: confirm message wording after laundry owner interviews.
 *
 * Spec reference: Rinsion_Technical_Overview.md §11 → ORDER_READY trigger
 */
export async function sendOrderReadySms(orderId: string): Promise<void> {
  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, order_number, pickup_code, laundry_id, customer_id,
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
  const message = `${laundryName}: Your order ${order.order_number} is ready for pickup! Show code ${order.pickup_code} when collecting. We look forward to seeing you.`

  await sendSms({
    laundryId: order.laundry_id,
    orderId: order.id,
    customerId: order.customer_id,
    phone,
    message,
    triggerEvent: 'ORDER_READY',
  })
}
