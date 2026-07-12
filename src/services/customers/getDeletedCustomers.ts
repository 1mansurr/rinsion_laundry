'use server'

import { createClient } from '@/lib/supabase'

export interface DeletedCustomer {
  id: string
  firstName: string
  lastName: string
  phone: string
  deletedAt: string
}

export async function getDeletedCustomers(laundryId: string): Promise<DeletedCustomer[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone, deleted_at')
    .eq('laundry_id', laundryId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  return (data ?? []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone,
    deletedAt: r.deleted_at as string,
  }))
}
