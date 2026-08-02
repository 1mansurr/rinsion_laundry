import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { ROLES } from '@/constants/statuses'

function monthStart(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function todayStart(): string {
  return new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'
}

/**
 * Mirrors services/reports/index.ts's getRevenueReport + getOrdersReport +
 * getEmployeeActivityReport, combined (same as the website's page.tsx
 * fetching all three together) — reimplemented against the admin client
 * since all three use the cookie-session client internally.
 */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const ms = monthStart()
  const ts = todayStart()

  const [{ data: payments }, { data: activeOrders }, { data: allOrders }, { data: logs }, { data: emps }] = await Promise.all([
    admin
      .from('payments')
      .select('amount, created_at, orders!inner(laundry_id, deleted_at)')
      .eq('orders.laundry_id', profile.laundryId)
      .is('orders.deleted_at', null),
    admin
      .from('orders')
      .select('id, total')
      .eq('laundry_id', profile.laundryId)
      .is('deleted_at', null)
      .not('status', 'in', '("collected","cancelled")'),
    admin
      .from('orders')
      .select('status, created_at')
      .eq('laundry_id', profile.laundryId)
      .is('deleted_at', null),
    admin
      .from('activity_logs')
      .select('employee_id, action_type')
      .eq('laundry_id', profile.laundryId)
      .gte('created_at', ms)
      .in('action_type', ['ORDER_CREATED', 'PAYMENT_RECORDED', 'STATUS_UPDATED']),
    admin
      .from('employees')
      .select('id, first_name, last_name')
      .eq('laundry_id', profile.laundryId)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ])

  const allPayments = payments ?? []
  const totalAllTime = allPayments.reduce((s, p) => s + Number(p.amount), 0)
  const thisMonth = allPayments.filter(p => p.created_at >= ms).reduce((s, p) => s + Number(p.amount), 0)
  const today = allPayments.filter(p => p.created_at >= ts).reduce((s, p) => s + Number(p.amount), 0)

  const activeIds = (activeOrders ?? []).map(o => o.id)
  const totalActiveValue = (activeOrders ?? []).reduce((s, o) => s + Number(o.total), 0)
  let paidOnActive = 0
  if (activeIds.length > 0) {
    const { data: activePmts } = await admin.from('payments').select('amount').in('order_id', activeIds)
    paidOnActive = (activePmts ?? []).reduce((s, p) => s + Number(p.amount), 0)
  }

  const revenue = {
    totalAllTime,
    thisMonth,
    today,
    outstandingBalance: Math.max(0, totalActiveValue - paidOnActive),
  }

  const all = allOrders ?? []
  const byStatus: Record<string, number> = {}
  for (const o of all) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
  const orders = {
    totalAllTime: all.length,
    thisMonth: all.filter(o => o.created_at >= ms).length,
    today: all.filter(o => o.created_at >= ts).length,
    byStatus,
  }

  const counts = new Map<string, { ordersCreated: number; paymentsRecorded: number; statusUpdates: number }>()
  for (const log of logs ?? []) {
    if (!log.employee_id) continue
    if (!counts.has(log.employee_id)) counts.set(log.employee_id, { ordersCreated: 0, paymentsRecorded: 0, statusUpdates: 0 })
    const c = counts.get(log.employee_id)!
    if (log.action_type === 'ORDER_CREATED') c.ordersCreated++
    else if (log.action_type === 'PAYMENT_RECORDED') c.paymentsRecorded++
    else if (log.action_type === 'STATUS_UPDATED') c.statusUpdates++
  }
  const employeeActivity = (emps ?? []).map(e => ({
    employeeId: e.id,
    name: `${e.first_name} ${e.last_name}`,
    ...(counts.get(e.id) ?? { ordersCreated: 0, paymentsRecorded: 0, statusUpdates: 0 }),
  }))

  return NextResponse.json({ revenue, orders, employeeActivity })
}
