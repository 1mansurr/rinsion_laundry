'use server'

import { createClient, type DbClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'

// client is overridable for the mobile API routes (src/app/api/mobile/),
// which pass createAdminClient() — see getOrdersList.ts's comment on why.
// laundryId is enforced explicitly here (not just left to RLS): the website
// path already relies on tenant_isolation via createClient(), but an
// admin-client caller bypasses RLS entirely, so this filter is the only
// thing standing between a mobile request and another laundry's order.
export async function getOrder(id: string, laundryId: string, client: DbClient = createClient()) {
  const supabase = client
  const { data } = await supabase
    .from('orders')
    .select(`
      id, order_number, pickup_code, status, priority, pickup_date, subtotal, tax_amount, total, created_at, location,
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
      sms_messages(id, trigger_event, status, phone, created_at),
      logistics_requests(id, kind, status, created_at)
    `)
    .eq('id', id)
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .single()

  if (!data) return data
  const customer = data.customers as unknown as { id: string; first_name: string; last_name: string; phone: string } | null
  if (customer) {
    customer.first_name = decryptField(customer.first_name) ?? ''
    customer.last_name = decryptField(customer.last_name) ?? ''
    customer.phone = decryptField(customer.phone) ?? ''
  }
  return { ...data, location: decryptField(data.location) }
}
