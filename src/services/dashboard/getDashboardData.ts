'use server'

import { createClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { computeSmsUsage } from '@/services/notifications/computeSmsUsage'
import type { EmployeeRole } from '@/constants/statuses'
import type { SubscriptionStatus } from '@/constants/subscriptionStatuses'
import type { ReadyOrder, ActivityEntry } from '@/app/(app)/dashboard/DashboardClient'

export interface DashboardData {
  needsOnboarding: boolean
  readyOrders: ReadyOrder[]
  isFirstTime: boolean
  adminStats?: { ordersToday: number; outstandingBalance: number; activeCustomersThisWeek: number }
  activities: ActivityEntry[]
  showSmsBanner: boolean
  smsUsed: number
  smsQuota: number
  subscriptionStatus: SubscriptionStatus | null
  todayDate: string
}

export async function getDashboardData(
  laundryId: string,
  role: EmployeeRole,
  branchId: string
): Promise<DashboardData> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  // Check if admin has any item types; if not, dashboard defers to onboarding
  if (role === 'admin') {
    const { count: itemCount } = await supabase
      .from('item_types')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_id', laundryId)
      .eq('is_active', true)
    if ((itemCount ?? 0) === 0) {
      return {
        needsOnboarding: true,
        readyOrders: [], isFirstTime: true, activities: [],
        showSmsBanner: false, smsUsed: 0, smsQuota: 0, subscriptionStatus: null, todayDate: '',
      }
    }
  }

  const [subscription, readyRes, todayCountRes, totalOrdersRes, activityRes] = await Promise.all([
    getActiveSubscription(laundryId),

    supabase
      .from('orders')
      .select('id, order_number, pickup_code, updated_at, total, payments(amount), order_refunds(amount), customers(first_name, last_name, phone), branches(id, name)')
      .eq('laundry_id', laundryId)
      .eq('status', 'ready')
      .is('deleted_at', null)
      .order('updated_at', { ascending: true }),

    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_id', laundryId)
      .gte('created_at', `${today}T00:00:00`)
      .is('deleted_at', null),

    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_id', laundryId)
      .is('deleted_at', null),

    supabase
      .from('activity_logs')
      .select('id, action_type, description, created_at, internal_admin_email, employees(first_name, last_name), orders(customers(first_name, last_name))')
      .eq('laundry_id', laundryId)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const smsUsed = subscription
    ? await computeSmsUsage(laundryId, subscription.cycleStartDate, subscription.cycleEndDate)
    : 0

  // Shape ready orders + filter by branch for employees
  const allReady = (readyRes.data ?? []).map(o => {
    const c = o.customers as unknown as { first_name: string; last_name: string; phone: string } | null
    const b = o.branches as unknown as { id: string; name: string } | null
    const pmts = (o.payments as unknown as { amount: number }[] | null) ?? []
    const refs = (o.order_refunds as unknown as { amount: number }[] | null) ?? []
    const amountPaid = pmts.reduce((s, p) => s + Number(p.amount), 0) - refs.reduce((s, r) => s + Number(r.amount), 0)
    return {
      id: o.id,
      orderNumber: o.order_number,
      pickupCode: o.pickup_code,
      customerName: c ? `${decryptField(c.first_name) ?? ''} ${decryptField(c.last_name) ?? ''}`.trim() : '—',
      phone: c ? decryptField(c.phone) ?? '' : '',
      branchId: b?.id ?? '',
      branchName: b?.name ?? '',
      readySince: o.updated_at,
      balance: Math.max(0, Number(o.total) - amountPaid),
    }
  })
  const readyOrders = role === 'admin'
    ? allReady
    : allReady.filter(o => o.branchId === branchId)

  // Shape activity log
  const activities = (activityRes.data ?? []).map(a => {
    const emp = a.employees as unknown as { first_name: string; last_name: string } | null
    const ord = a.orders as unknown as { customers: { first_name: string; last_name: string } | null } | null
    const cust = ord?.customers ?? null
    return {
      id: a.id as string,
      description: a.description as string,
      actionType: a.action_type as string,
      createdAt: a.created_at as string,
      employeeName: emp ? `${emp.first_name} ${emp.last_name}` : (a.internal_admin_email as string | null) ?? '',
      customerName: cust ? `${decryptField(cust.first_name) ?? ''} ${decryptField(cust.last_name) ?? ''}`.trim() : '',
    }
  })

  // Admin-only stats
  let adminStats: { ordersToday: number; outstandingBalance: number; activeCustomersThisWeek: number } | undefined

  if (role === 'admin') {
    const [activeOrdersRes, weekOrdersRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total')
        .eq('laundry_id', laundryId)
        .not('status', 'in', '(collected,cancelled)')
        .is('deleted_at', null),
      supabase
        .from('orders')
        .select('customer_id')
        .eq('laundry_id', laundryId)
        .gte('created_at', weekAgo)
        .is('deleted_at', null),
    ])

    let outstandingBalance = 0
    if ((activeOrdersRes.data ?? []).length > 0) {
      const ids = (activeOrdersRes.data ?? []).map(o => o.id)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, order_id')
        .in('order_id', ids)
      outstandingBalance = (activeOrdersRes.data ?? []).reduce((sum, o) => {
        const paid = (payments ?? [])
          .filter(p => p.order_id === o.id)
          .reduce((s, p) => s + Number(p.amount), 0)
        return sum + Math.max(0, Number(o.total) - paid)
      }, 0)
    }

    adminStats = {
      ordersToday: todayCountRes.count ?? 0,
      outstandingBalance,
      activeCustomersThisWeek: new Set((weekOrdersRes.data ?? []).map(o => o.customer_id)).size,
    }
  }

  const showSmsBanner =
    role === 'admin' &&
    subscription !== null &&
    subscription.smsQuota > 0 &&
    smsUsed / subscription.smsQuota >= 0.7

  const todayDate = new Date().toLocaleDateString('en-GH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return {
    needsOnboarding: false,
    readyOrders,
    isFirstTime: (totalOrdersRes.count ?? 0) === 0,
    adminStats,
    activities,
    showSmsBanner,
    smsUsed,
    smsQuota: subscription?.smsQuota ?? 0,
    subscriptionStatus: subscription?.status ?? null,
    todayDate,
  }
}
