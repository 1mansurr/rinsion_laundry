'use server'

import { createClient } from '@/lib/supabase'

export async function getOrder(id: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('orders')
    .select(`
      id, order_number, pickup_code, status, priority, pickup_date, subtotal, tax_amount, total, created_at,
      customers(id, first_name, last_name, phone),
      branches(name),
      order_items(
        id, quantity, unit_price, total_price, pricing_mode,
        item_types(name),
        services(name),
        order_item_pieces(id, item_type_id, quantity, item_types(name))
      ),
      payments(id, amount, payment_method, created_at),
      order_refunds(id, amount, refund_method, reason, created_at),
      order_notes(id, note, created_at, created_by_type),
      order_status_history(previous_status, new_status, created_at),
      sms_messages(id, trigger_event, status, phone, created_at)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  return data
}
