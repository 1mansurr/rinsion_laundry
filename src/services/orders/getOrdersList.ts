'use server'

import { createClient } from '@/lib/supabase'
import { decryptField, computeBlindIndex } from '@/lib/crypto'
import { normalizeCustomerPhone } from '@/utils/normalizeCustomerPhone'

export interface OrderListRow {
  id: string
  orderNumber: string
  customerName: string
  customerInitials: string
  customerPhone: string
  branchName: string
  /** Sum of per_item order line quantities */
  pieces: number
  /** Sum of per_kg order line quantities */
  kg: number
  status: string
  total: number
  balance: number
  createdAt: string
}

export async function getOrdersList(
  laundryId: string,
  options: { status?: string; q?: string; page?: number; perPage?: number } = {}
): Promise<{ rows: OrderListRow[]; total: number }> {
  const supabase = createClient()
  const { status, q, page = 1, perPage = 30 } = options
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // For search, first find matching customer IDs by name/phone. Names are
  // encrypted at rest — ciphertext can't substring-match, so this fetches
  // the laundry's customers and decrypts+filters in the app (Option B; see
  // getCustomersList.ts). Phone search still matches a full, exact phone
  // number via the blind index.
  let matchedCustomerIds: string[] | null = null
  if (q) {
    const qDigits = q.replace(/\D/g, '')
    const phoneBidx = qDigits.length >= 9 ? computeBlindIndex(normalizeCustomerPhone(q)) : null
    const needle = q.trim().toLowerCase()
    const { data: custs } = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone_bidx')
      .eq('laundry_id', laundryId)
      .is('deleted_at', null)
    matchedCustomerIds = (custs ?? [])
      .filter(c => {
        if (phoneBidx !== null && c.phone_bidx === phoneBidx) return true
        const fn = decryptField(c.first_name) ?? ''
        const ln = decryptField(c.last_name) ?? ''
        return `${fn} ${ln}`.toLowerCase().includes(needle)
      })
      .slice(0, 50)
      .map(c => c.id)
  }

  let query = supabase
    .from('orders')
    .select(
      `id, order_number, status, total, created_at,
       customers!inner(first_name, last_name, phone),
       branches(name),
       order_items(quantity, pricing_mode),
       payments(amount)`,
      { count: 'exact' }
    )
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') query = query.eq('status', status)

  if (q) {
    const custIds = matchedCustomerIds ?? []
    if (custIds.length > 0) {
      query = query.or(
        `order_number.ilike.*${q}*,pickup_code.ilike.*${q}*,customer_id.in.(${custIds.join(',')})`
      )
    } else {
      query = query.or(`order_number.ilike.*${q}*,pickup_code.ilike.*${q}*`)
    }
  }

  const { data, count } = await query

  const rows = (data ?? []).map(o => {
    const cust = o.customers as unknown as { first_name: string; last_name: string; phone: string } | null
    const branch = o.branches as unknown as { name: string } | null
    const items = (o.order_items as unknown as { quantity: number; pricing_mode: 'per_item' | 'per_kg' }[]) ?? []
    const pmts = (o.payments as unknown as { amount: number }[]) ?? []
    const fn = cust ? decryptField(cust.first_name) ?? '' : ''
    const ln = cust ? decryptField(cust.last_name) ?? '' : ''
    return {
      id: o.id,
      orderNumber: o.order_number,
      customerName: `${fn} ${ln}`.trim(),
      customerInitials: `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase(),
      customerPhone: cust ? decryptField(cust.phone) ?? '' : '',
      branchName: branch?.name ?? '',
      pieces: items.filter(i => i.pricing_mode !== 'per_kg').reduce((s, i) => s + (i.quantity ?? 0), 0),
      kg: items.filter(i => i.pricing_mode === 'per_kg').reduce((s, i) => s + (i.quantity ?? 0), 0),
      status: o.status,
      total: Number(o.total),
      balance: Math.max(0, Number(o.total) - pmts.reduce((s, p) => s + Number(p.amount), 0)),
      createdAt: o.created_at,
    }
  })

  return { rows, total: count ?? 0 }
}
