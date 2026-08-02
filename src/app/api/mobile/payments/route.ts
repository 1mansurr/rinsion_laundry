import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'

/**
 * Mirrors services/payments/getPayments.ts's getPayments + getPaymentsSummary,
 * combined into one response (same as the website's payments/page.tsx
 * fetching both together) — reimplemented against the admin client since
 * both functions use the cookie-session client internally, not an
 * injectable one, same reasoning as every other mobile route here.
 */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const method = searchParams.get('method') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const perPage = 30
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const admin = createAdminClient()

  let query = admin
    .from('payments')
    .select(
      `id, amount, payment_method, created_at,
       orders!inner(id, order_number, laundry_id, customers(first_name, last_name)),
       employees(first_name, last_name)`,
      { count: 'exact' }
    )
    .eq('orders.laundry_id', profile.laundryId)
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
      customerName: cust ? `${decryptField(cust.first_name) ?? ''} ${decryptField(cust.last_name) ?? ''}`.trim() : '',
      method: (p.payment_method as string) ?? '',
      amount: Number(p.amount),
      recordedBy: emp ? `${emp.first_name} ${emp.last_name}` : '',
    }
  })

  const now = new Date()
  const todayStart = now.toISOString().split('T')[0] + 'T00:00:00.000Z'
  const dow = now.getDay()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).toISOString()

  const { data: allPayments } = await admin
    .from('payments')
    .select('amount, created_at, orders!inner(laundry_id)')
    .eq('orders.laundry_id', profile.laundryId)

  const all = allPayments ?? []
  const collectedToday = all.filter(p => p.created_at >= todayStart).reduce((s, p) => s + Number(p.amount), 0)
  const collectedThisWeek = all.filter(p => p.created_at >= weekStart).reduce((s, p) => s + Number(p.amount), 0)

  const { data: activeOrders } = await admin
    .from('orders')
    .select('id, total')
    .eq('laundry_id', profile.laundryId)
    .is('deleted_at', null)
    .not('status', 'in', '("collected","cancelled")')

  const activeIds = (activeOrders ?? []).map(o => o.id)
  let paidOnActive = 0
  if (activeIds.length > 0) {
    const { data: activePmts } = await admin.from('payments').select('amount').in('order_id', activeIds)
    paidOnActive = (activePmts ?? []).reduce((s, p) => s + Number(p.amount), 0)
  }
  const outstandingBalance = Math.max(0, (activeOrders ?? []).reduce((s, o) => s + Number(o.total), 0) - paidOnActive)

  return NextResponse.json({
    rows,
    total: count ?? 0,
    summary: { collectedToday, collectedThisWeek, outstandingBalance },
  })
}
