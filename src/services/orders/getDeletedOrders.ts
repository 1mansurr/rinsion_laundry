'use server'

import { createClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'

export interface DeletedOrder {
  id: string
  orderNumber: string
  status: string
  total: number
  customerName: string
  deletedAt: string
}

export async function getDeletedOrders(laundryId: string): Promise<DeletedOrder[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, status, total, deleted_at, customers(first_name, last_name)')
    .eq('laundry_id', laundryId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  return (data ?? []).map(r => {
    const customer = r.customers as unknown as { first_name: string; last_name: string } | null
    return {
      id: r.id,
      orderNumber: r.order_number,
      status: r.status,
      total: Number(r.total),
      customerName: customer ? `${decryptField(customer.first_name) ?? ''} ${decryptField(customer.last_name) ?? ''}`.trim() : '—',
      deletedAt: r.deleted_at as string,
    }
  })
}
