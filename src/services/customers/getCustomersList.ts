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

  const selectCols = `id, first_name, last_name, phone, phone_bidx, last_visit_date,
       orders(id, total, status, created_at, payments(amount))`

  type Row = {
    id: string; first_name: string; last_name: string; phone: string; phone_bidx: string
    orders: { id: string; total: number; status: string; created_at: string; payments: { amount: number }[] }[] | null
  }

  const shape = (c: Row): CustomerListRow => {
    const orders = c.orders ?? []

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
      firstName: decryptField(c.first_name) ?? '',
      lastName: decryptField(c.last_name) ?? '',
      phone: decryptField(c.phone) ?? '',
      ordersCount,
      totalSpent,
      outstandingBalance,
      lastOrderDate,
    }
  }

  if (!q) {
    const { data, count } = await supabase
      .from('customers')
      .select(selectCols, { count: 'exact' })
      .eq('laundry_id', laundryId)
      .is('deleted_at', null)
      .order('last_visit_date', { ascending: false, nullsFirst: false })
      .range(from, to)

    return { rows: ((data ?? []) as unknown as Row[]).map(shape), total: count ?? 0 }
  }

  // Names are encrypted at rest — ciphertext can't substring-match, so
  // search fetches every laundry-scoped customer, decrypts names in the app,
  // and filters with a plain substring check (Option B: cheap at the scale
  // a single laundry's customer list runs at; revisit with a dedicated
  // search index only if that stops being true). Phone search still uses
  // the blind index for an exact match, computed server-side.
  const qDigits = q.replace(/\D/g, '')
  const phoneBidx = qDigits.length >= 9 ? computeBlindIndex(normalizeCustomerPhone(q)) : null
  const needle = q.trim().toLowerCase()

  const { data: allRows } = await supabase
    .from('customers')
    .select(selectCols)
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('last_visit_date', { ascending: false, nullsFirst: false })

  const rows = (allRows ?? []) as unknown as Row[]
  const filtered = rows
    .filter(r => {
      const matchesPhone = phoneBidx !== null && r.phone_bidx === phoneBidx
      if (matchesPhone) return true
      const fn = decryptField(r.first_name) ?? ''
      const ln = decryptField(r.last_name) ?? ''
      return `${fn} ${ln}`.toLowerCase().includes(needle)
    })
    .map(shape)

  return { rows: filtered.slice(from, to + 1), total: filtered.length }
}
