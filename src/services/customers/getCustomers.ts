'use server'

import { createClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'

export interface Customer {
  id: string
  customerCode: string
  firstName: string
  lastName: string
  phone: string
  location: string | null
  lastVisitDate: string | null
  createdAt: string
}

export async function getCustomers(laundryId: string): Promise<Customer[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('customers')
    .select('id, customer_code, first_name, last_name, phone, location, last_visit_date, created_at')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('last_visit_date', { ascending: false, nullsFirst: false })

  return (data ?? []).map(r => ({
    id: r.id,
    customerCode: r.customer_code,
    firstName: decryptField(r.first_name) ?? '',
    lastName: decryptField(r.last_name) ?? '',
    phone: decryptField(r.phone) ?? '',
    location: decryptField(r.location),
    lastVisitDate: r.last_visit_date,
    createdAt: r.created_at,
  }))
}
