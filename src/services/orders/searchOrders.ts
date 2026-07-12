'use server'

import { createClient } from '@/lib/supabase'
import { decryptField, computeBlindIndex } from '@/lib/crypto'
import { normalizeCustomerPhone } from '@/utils/normalizeCustomerPhone'
import type { OrderStatus, OrderPriority } from '@/constants/statuses'
import type { OrderListItem } from './getOrders'

export async function searchOrders(laundryId: string, query: string): Promise<OrderListItem[]> {
  if (!query.trim()) return []
  const supabase = createClient()
  const q = query.trim()

  const orderSelect = `
    id, order_number, status, priority, total, pickup_date, created_at,
    customers(first_name, last_name, phone),
    branches(name)
  `

  const toItem = (r: Record<string, unknown>): OrderListItem => {
    const customer = r.customers as { first_name: string; last_name: string; phone: string } | null
    const branch = r.branches as { name: string } | null
    return {
      id: r.id as string,
      orderNumber: r.order_number as string,
      status: r.status as OrderStatus,
      priority: r.priority as OrderPriority,
      total: Number(r.total),
      pickupDate: r.pickup_date as string | null,
      createdAt: r.created_at as string,
      customerName: customer ? `${customer.first_name} ${customer.last_name}` : '',
      customerPhone: customer ? decryptField(customer.phone) ?? '' : '',
      branchName: (branch as { name: string } | null)?.name ?? '',
    }
  }

  // Search by order number and pickup code
  const { data: byOrder } = await supabase
    .from('orders')
    .select(orderSelect)
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .or(`order_number.ilike.*${q}*,pickup_code.ilike.*${q}*`)
    .order('created_at', { ascending: false })
    .limit(20)

  // Search by customer name / phone. phone is encrypted at rest — ciphertext
  // can't substring-match, so phone search only matches a full, exact phone
  // number via the blind index.
  const qDigits = q.replace(/\D/g, '')
  const customerOrFilter = qDigits.length >= 9
    ? `first_name.ilike.*${q}*,last_name.ilike.*${q}*,phone_bidx.eq.${computeBlindIndex(normalizeCustomerPhone(q))}`
    : `first_name.ilike.*${q}*,last_name.ilike.*${q}*`
  const { data: matchingCustomers } = await supabase
    .from('customers')
    .select('id')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .or(customerOrFilter)
    .limit(50)

  const customerIds = (matchingCustomers ?? []).map(c => c.id)
  let byCustomer: typeof byOrder = []
  if (customerIds.length > 0) {
    const { data } = await supabase
      .from('orders')
      .select(orderSelect)
      .eq('laundry_id', laundryId)
      .is('deleted_at', null)
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
      .limit(20)
    byCustomer = data
  }

  // Merge and deduplicate
  const seen = new Set<string>()
  const merged: OrderListItem[] = []
  for (const r of [...(byOrder ?? []), ...(byCustomer ?? [])]) {
    const id = r.id as string
    if (!seen.has(id)) { seen.add(id); merged.push(toItem(r as Record<string, unknown>)) }
  }
  return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
