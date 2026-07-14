'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'

export interface RevenueReport {
  totalAllTime: number
  thisMonth: number
  today: number
  outstandingBalance: number
}

export interface OrdersReport {
  totalAllTime: number
  thisMonth: number
  today: number
  byStatus: Record<string, number>
}

export interface EmployeeActivityItem {
  employeeId: string
  name: string
  ordersCreated: number
  paymentsRecorded: number
  statusUpdates: number
}

function monthStart(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function todayStart(): string {
  return new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'
}

export async function getRevenueReport(laundryId: string): Promise<RevenueReport> {
  const supabase = createClient()

  // All payments for this laundry (join through orders)
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, created_at, orders!inner(laundry_id, deleted_at)')
    .eq('orders.laundry_id', laundryId)
    .is('orders.deleted_at', null)

  const allPayments = payments ?? []
  const ms = monthStart()
  const ts = todayStart()

  const totalAllTime = allPayments.reduce((s, p) => s + Number(p.amount), 0)
  const thisMonth = allPayments.filter(p => p.created_at >= ms).reduce((s, p) => s + Number(p.amount), 0)
  const today = allPayments.filter(p => p.created_at >= ts).reduce((s, p) => s + Number(p.amount), 0)

  // Outstanding: active orders with unpaid balance
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('id, total')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .not('status', 'in', '("collected","cancelled")')

  const activeIds = (activeOrders ?? []).map(o => o.id)
  const totalActiveValue = (activeOrders ?? []).reduce((s, o) => s + Number(o.total), 0)

  let paidOnActive = 0
  if (activeIds.length > 0) {
    const { data: activePmts } = await supabase
      .from('payments')
      .select('amount')
      .in('order_id', activeIds)
    paidOnActive = (activePmts ?? []).reduce((s, p) => s + Number(p.amount), 0)
  }

  return {
    totalAllTime,
    thisMonth,
    today,
    outstandingBalance: Math.max(0, totalActiveValue - paidOnActive),
  }
}

export async function getOrdersReport(laundryId: string): Promise<OrdersReport> {
  const supabase = createClient()
  const ms = monthStart()
  const ts = todayStart()

  const { data: orders } = await supabase
    .from('orders')
    .select('status, created_at')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)

  const all = orders ?? []
  const byStatus: Record<string, number> = {}
  for (const o of all) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
  }

  return {
    totalAllTime: all.length,
    thisMonth: all.filter(o => o.created_at >= ms).length,
    today: all.filter(o => o.created_at >= ts).length,
    byStatus,
  }
}

export async function getEmployeeActivityReport(laundryId: string): Promise<EmployeeActivityItem[]> {
  const supabase = createClient()
  const ms = monthStart()

  const [{ data: logs }, { data: emps }] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('employee_id, action_type')
      .eq('laundry_id', laundryId)
      .gte('created_at', ms)
      .in('action_type', ['ORDER_CREATED', 'PAYMENT_RECORDED', 'STATUS_UPDATED']),
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('laundry_id', laundryId)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ])

  const empMap = new Map<string, string>()
  for (const e of (emps ?? [])) {
    empMap.set(e.id, `${e.first_name} ${e.last_name}`)
  }

  const counts = new Map<string, { ordersCreated: number; paymentsRecorded: number; statusUpdates: number }>()
  for (const log of (logs ?? [])) {
    if (!log.employee_id) continue
    if (!counts.has(log.employee_id)) {
      counts.set(log.employee_id, { ordersCreated: 0, paymentsRecorded: 0, statusUpdates: 0 })
    }
    const c = counts.get(log.employee_id)!
    if (log.action_type === 'ORDER_CREATED') c.ordersCreated++
    else if (log.action_type === 'PAYMENT_RECORDED') c.paymentsRecorded++
    else if (log.action_type === 'STATUS_UPDATED') c.statusUpdates++
  }

  return (emps ?? []).map(e => ({
    employeeId: e.id,
    name: `${e.first_name} ${e.last_name}`,
    ...(counts.get(e.id) ?? { ordersCreated: 0, paymentsRecorded: 0, statusUpdates: 0 }),
  }))
}

export async function getAllReports() {
  const profile = await getMyProfile()
  if (!profile) return null

  const [revenue, orders, employeeActivity] = await Promise.all([
    getRevenueReport(profile.laundryId),
    getOrdersReport(profile.laundryId),
    getEmployeeActivityReport(profile.laundryId),
  ])

  return { revenue, orders, employeeActivity }
}
