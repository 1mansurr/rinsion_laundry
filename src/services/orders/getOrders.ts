'use server'

import { createClient } from '@/lib/supabase'
import type { OrderStatus, OrderPriority } from '@/constants/statuses'

export interface OrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  priority: OrderPriority
  total: number
  pickupDate: string | null
  createdAt: string
  customerName: string
  customerPhone: string
  branchName: string
}

export async function getOrders(laundryId: string, status?: OrderStatus): Promise<OrderListItem[]> {
  const supabase = createClient()

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, status, priority, total, pickup_date, created_at,
      customers(first_name, last_name, phone),
      branches(name)
    `)
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data } = await query

  return (data ?? []).map(r => {
    const customer = r.customers as unknown as { first_name: string; last_name: string; phone: string } | null
    const branch = r.branches as unknown as { name: string } | null
    return {
      id: r.id,
      orderNumber: r.order_number,
      status: r.status as OrderStatus,
      priority: r.priority as OrderPriority,
      total: Number(r.total),
      pickupDate: r.pickup_date,
      createdAt: r.created_at,
      customerName: customer ? `${customer.first_name} ${customer.last_name}` : '',
      customerPhone: customer?.phone ?? '',
      branchName: branch?.name ?? '',
    }
  })
}
