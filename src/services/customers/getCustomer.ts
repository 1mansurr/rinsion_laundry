'use server'

import { createClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'

export async function getCustomer(id: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('customers')
    .select(`
      id, customer_code, first_name, last_name, phone, first_visit_date, last_visit_date, created_at,
      orders(id, order_number, status, total, created_at, pickup_date)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!data) return data
  return { ...data, phone: decryptField(data.phone) ?? '' }
}
