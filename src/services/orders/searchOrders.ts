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
      customerName: customer ? `${decryptField(customer.first_name) ?? ''} ${decryptField(customer.last_name) ?? ''}`.trim() : '',
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

  // Search by customer name / phone. Names are encrypted at rest —
  // ciphertext can't substring-match, so this fetches the laundry's
  // customers and decrypts+filters in the app (Option B; see
  // getCustomersList.ts). Phone search still matches a full, exact phone
  // number via the blind index.
  const qDigits = q.replace(/\D/g, '')
  const phoneBidx = qDigits.length >= 9 ? computeBlindIndex(normalizeCustomerPhone(q)) : null
  const needle = q.toLowerCase()
  const { data: allCustomers } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone_bidx')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)

  const customerIds = (allCustomers ?? [])
    .filter(c => {
      if (phoneBidx !== null && c.phone_bidx === phoneBidx) return true
      const fn = decryptField(c.first_name) ?? ''
      const ln = decryptField(c.last_name) ?? ''
      return `${fn} ${ln}`.toLowerCase().includes(needle)
    })
    .slice(0, 50)
    .map(c => c.id)
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
