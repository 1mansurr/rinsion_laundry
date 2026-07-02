import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { computeSmsUsage } from '@/services/notifications/computeSmsUsage'
import { DashboardClient } from './DashboardClient'
import type { ReadyOrder, ActivityEntry } from './DashboardClient'

export default async function DashboardPage() {
  const profile = await getMyProfile()
  if (!profile) return null

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  // Redirect admin with no items to onboarding
  if (profile.role === 'admin') {
    const { count: itemCount } = await supabase
      .from('item_types')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .eq('is_active', true)
    if ((itemCount ?? 0) === 0) redirect('/onboarding')
  }

  const [subscription, readyRes, todayCountRes, totalOrdersRes, activityRes] = await Promise.all([
    getActiveSubscription(profile.laundryId),

    supabase
      .from('orders')
      .select('id, order_number, pickup_code, updated_at, total, payments(amount), customers(first_name, last_name, phone), branches(id, name)')
      .eq('laundry_id', profile.laundryId)
      .eq('status', 'ready')
      .is('deleted_at', null)
      .order('updated_at', { ascending: true }),

    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .gte('created_at', `${today}T00:00:00`)
      .is('deleted_at', null),

    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .is('deleted_at', null),

    supabase
      .from('activity_logs')
      .select('id, action_type, description, created_at, employees(first_name, last_name), orders(customers(first_name, last_name))')
      .eq('laundry_id', profile.laundryId)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const smsUsed = subscription
    ? await computeSmsUsage(profile.laundryId, subscription.cycleStartDate, subscription.cycleEndDate)
    : 0

  // Shape ready orders + filter by branch for employees
  const allReady: ReadyOrder[] = (readyRes.data ?? []).map(o => {
    const c = o.customers as unknown as { first_name: string; last_name: string; phone: string } | null
    const b = o.branches as unknown as { id: string; name: string } | null
    const pmts = (o.payments as unknown as { amount: number }[] | null) ?? []
    const amountPaid = pmts.reduce((s, p) => s + Number(p.amount), 0)
    return {
      id: o.id,
      orderNumber: o.order_number,
      pickupCode: o.pickup_code,
      customerName: c ? `${c.first_name} ${c.last_name}` : '—',
      phone: c?.phone ?? '',
      branchId: b?.id ?? '',
      branchName: b?.name ?? '',
      readySince: o.updated_at,
      balance: Math.max(0, Number(o.total) - amountPaid),
    }
  })
  const readyOrders = profile.role === 'admin'
    ? allReady
    : allReady.filter(o => (o as ReadyOrder & { branchId: string }).branchId === profile.branchId)

  // Shape activity log
  const activities: ActivityEntry[] = (activityRes.data ?? []).map(a => {
    const emp = a.employees as unknown as { first_name: string; last_name: string } | null
    const ord = a.orders as unknown as { customers: { first_name: string; last_name: string } | null } | null
    const cust = ord?.customers ?? null
    return {
      id: a.id as string,
      description: a.description as string,
      actionType: a.action_type as string,
      createdAt: a.created_at as string,
      employeeName: emp ? `${emp.first_name} ${emp.last_name}` : '',
      customerName: cust ? `${cust.first_name} ${cust.last_name}`.trim() : '',
    }
  })

  // Admin-only stats
  let adminStats: { ordersToday: number; outstandingBalance: number; activeCustomersThisWeek: number } | undefined

  if (profile.role === 'admin') {
    const [activeOrdersRes, weekOrdersRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total')
        .eq('laundry_id', profile.laundryId)
        .not('status', 'in', '(collected,cancelled)')
        .is('deleted_at', null),
      supabase
        .from('orders')
        .select('customer_id')
        .eq('laundry_id', profile.laundryId)
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
    profile.role === 'admin' &&
    subscription !== null &&
    subscription.smsQuota > 0 &&
    smsUsed / subscription.smsQuota >= 0.7

  const todayDate = new Date().toLocaleDateString('en-GH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <DashboardClient
      profile={{
        firstName: profile.firstName,
        role: profile.role,
        branchId: profile.branchId,
        laundryName: profile.laundryName,
      }}
      readyOrders={readyOrders}
      isFirstTime={(totalOrdersRes.count ?? 0) === 0}
      adminStats={adminStats}
      activities={activities}
      showSmsBanner={showSmsBanner}
      smsUsed={smsUsed}
      smsQuota={subscription?.smsQuota ?? 0}
      subscriptionStatus={subscription?.status ?? null}
      todayDate={todayDate}
    />
  )
}
