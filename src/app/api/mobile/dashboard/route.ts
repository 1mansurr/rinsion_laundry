import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { ROLES } from '@/constants/statuses'

const MONTH_DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Mirrors services/dashboard/getDashboardData.ts via the admin client. */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  if (profile.role === ROLES.ADMIN) {
    const { count: itemCount } = await admin
      .from('item_types')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .eq('is_active', true)
    if ((itemCount ?? 0) === 0) {
      return NextResponse.json({
        needsOnboarding: true,
        readyOrders: [], isFirstTime: true, activities: [],
        showSmsBanner: false, smsUsed: 0, smsQuota: 0, subscriptionStatus: null, todayDate: '',
      })
    }
  }

  const [subscription, readyRes, todayCountRes, totalOrdersRes, activityRes] = await Promise.all([
    getActiveSubscription(profile.laundryId),
    admin
      .from('orders')
      .select('id, order_number, pickup_code, updated_at, total, payments(amount), order_refunds(amount), customers(first_name, last_name, phone), branches(id, name)')
      .eq('laundry_id', profile.laundryId)
      .eq('status', 'ready')
      .is('deleted_at', null)
      .order('updated_at', { ascending: true }),
    admin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .gte('created_at', `${today}T00:00:00`)
      .is('deleted_at', null),
    admin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_id', profile.laundryId)
      .is('deleted_at', null),
    admin
      .from('activity_logs')
      .select('id, action_type, description, created_at, internal_admin_email, employees(first_name, last_name), orders(customers(first_name, last_name))')
      .eq('laundry_id', profile.laundryId)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const smsUsed = subscription
    ? await (async () => {
        const { count } = await admin
          .from('sms_messages')
          .select('id', { count: 'exact', head: true })
          .eq('laundry_id', profile.laundryId)
          .eq('counts_toward_cap', true)
          .gte('created_at', `${subscription.cycleStartDate}T00:00:00`)
          .lte('created_at', `${subscription.cycleEndDate}T23:59:59`)
        return count ?? 0
      })()
    : 0

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
  const readyOrders = profile.role === ROLES.ADMIN
    ? allReady
    : allReady.filter(o => o.branchId === profile.branchId)

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

  let adminStats: { ordersToday: number; outstandingBalance: number; activeCustomersThisWeek: number } | undefined

  if (profile.role === ROLES.ADMIN) {
    const [activeOrdersRes, weekOrdersRes] = await Promise.all([
      admin
        .from('orders')
        .select('id, total')
        .eq('laundry_id', profile.laundryId)
        .not('status', 'in', '(collected,cancelled)')
        .is('deleted_at', null),
      admin
        .from('orders')
        .select('customer_id')
        .eq('laundry_id', profile.laundryId)
        .gte('created_at', weekAgo)
        .is('deleted_at', null),
    ])

    let outstandingBalance = 0
    if ((activeOrdersRes.data ?? []).length > 0) {
      const ids = (activeOrdersRes.data ?? []).map(o => o.id)
      const { data: payments } = await admin.from('payments').select('amount, order_id').in('order_id', ids)
      outstandingBalance = (activeOrdersRes.data ?? []).reduce((sum, o) => {
        const paid = (payments ?? []).filter(p => p.order_id === o.id).reduce((s, p) => s + Number(p.amount), 0)
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
    profile.role === ROLES.ADMIN &&
    subscription !== null &&
    subscription.smsQuota > 0 &&
    smsUsed / subscription.smsQuota >= 0.7

  const now = new Date()
  const todayDate = `${MONTH_DAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`

  return NextResponse.json({
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
  })
}
