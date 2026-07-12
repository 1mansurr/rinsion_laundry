'use server'

import { createClient } from '@/lib/supabase'
import { decryptField, computeBlindIndex } from '@/lib/crypto'
import { normalizeCustomerPhone } from '@/utils/normalizeCustomerPhone'

export interface CustomerListRow {
  id: string
  firstName: string
  lastName: string
  phone: string
  ordersCount: number
  totalSpent: number
  outstandingBalance: number
  lastOrderDate: string | null
}

export async function getCustomersList(
  laundryId: string,
  options: { q?: string; page?: number; perPage?: number } = {}
): Promise<{ rows: CustomerListRow[]; total: number }> {
  const supabase = createClient()
  const { q, page = 1, perPage = 30 } = options
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('customers')
    .select(
      `id, first_name, last_name, phone, last_visit_date,
       orders(id, total, status, created_at, payments(amount))`,
      { count: 'exact' }
    )
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('last_visit_date', { ascending: false, nullsFirst: false })
    .range(from, to)

  // phone is encrypted at rest — ciphertext can't substring-match, so name
  // search stays ilike, and phone search only matches a full, exact phone
  // number via the blind index (partial-digit phone search is no longer
  // possible; see src/lib/crypto/fieldEncryption.ts).
  if (q) {
    const qDigits = q.replace(/\D/g, '')
    if (qDigits.length >= 9) {
      const phoneBidx = computeBlindIndex(normalizeCustomerPhone(q))
      query = query.or(`first_name.ilike.*${q}*,last_name.ilike.*${q}*,phone_bidx.eq.${phoneBidx}`)
    } else {
      query = query.or(`first_name.ilike.*${q}*,last_name.ilike.*${q}*`)
    }
  }

  const { data, count } = await query

  const rows = (data ?? []).map(c => {
    const orders = (c.orders as unknown as {
      id: string; total: number; status: string; created_at: string
      payments: { amount: number }[]
    }[]) ?? []

    let totalSpent = 0
    let outstandingBalance = 0
    let lastOrderDate: string | null = null
    let ordersCount = 0

    for (const o of orders) {
      if (o.status === 'cancelled') continue
      ordersCount++
      const paid = (o.payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
      totalSpent += paid
      if (!['collected', 'cancelled'].includes(o.status)) {
        outstandingBalance += Math.max(0, Number(o.total) - paid)
      }
      if (!lastOrderDate || o.created_at > lastOrderDate) lastOrderDate = o.created_at
    }

    return {
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      phone: decryptField(c.phone) ?? '',
      ordersCount,
      totalSpent,
      outstandingBalance,
      lastOrderDate,
    }
  })

  return { rows, total: count ?? 0 }
}
