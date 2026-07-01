'use server'

import { createClient } from '@/lib/supabase'

export interface PaymentListRow {
  id: string
  receiptId: string
  date: string
  orderNumber: string
  orderId: string
  customerName: string
  method: string
  amount: number
  recordedBy: string
}

export interface PaymentsSummary {
  collectedToday: number
  collectedThisWeek: number
  outstandingBalance: number
}

export async function getPaymentsSummary(laundryId: string): Promise<PaymentsSummary> {
  const supabase = createClient()

  const now = new Date()
  const todayStart = now.toISOString().split('T')[0] + 'T00:00:00.000Z'
  const dow = now.getDay()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).toISOString()

  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount, created_at, orders!inner(laundry_id)')
    .eq('orders.laundry_id', laundryId)

  const all = allPayments ?? []
  const collectedToday = all.filter(p => p.created_at >= todayStart).reduce((s, p) => s + Number(p.amount), 0)
  const collectedThisWeek = all.filter(p => p.created_at >= weekStart).reduce((s, p) => s + Number(p.amount), 0)

  const { data: activeOrders } = await supabase
    .from('orders')
    .select('id, total')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .not('status', 'in', '("collected","cancelled")')

  const activeIds = (activeOrders ?? []).map(o => o.id)
  let paidOnActive = 0
  if (activeIds.length > 0) {
    const { data: activePmts } = await supabase.from('payments').select('amount').in('order_id', activeIds)
    paidOnActive = (activePmts ?? []).reduce((s, p) => s + Number(p.amount), 0)
  }
  const outstandingBalance = Math.max(
    0,
    (activeOrders ?? []).reduce((s, o) => s + Number(o.total), 0) - paidOnActive
  )

  return { collectedToday, collectedThisWeek, outstandingBalance }
}

export async function getPayments(
  laundryId: string,
  options: { q?: string; method?: string; page?: number; perPage?: number } = {}
): Promise<{ rows: PaymentListRow[]; total: number }> {
  const supabase = createClient()
  const { method, page = 1, perPage = 30 } = options
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('payments')
    .select(
      `id, amount, payment_method, created_at,
       orders!inner(id, order_number, laundry_id,
         customers(first_name, last_name)
       ),
       employees(first_name, last_name)`,
      { count: 'exact' }
    )
    .eq('orders.laundry_id', laundryId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (method && method !== 'all') query = query.eq('payment_method', method)

  const { data, count } = await query

  const rows = (data ?? []).map(p => {
    const order = p.orders as unknown as { id: string; order_number: string; customers: { first_name: string; last_name: string } | null } | null
    const emp = p.employees as unknown as { first_name: string; last_name: string } | null
    const cust = order?.customers
    return {
      id: p.id,
      receiptId: `RX-${p.id.slice(-6).toUpperCase()}`,
      date: p.created_at,
      orderNumber: order?.order_number ?? '',
      orderId: order?.id ?? '',
      customerName: cust ? `${cust.first_name} ${cust.last_name}` : '',
      method: (p.payment_method as string) ?? '',
      amount: Number(p.amount),
      recordedBy: emp ? `${emp.first_name} ${emp.last_name}` : '',
    }
  })

  return { rows, total: count ?? 0 }
}
