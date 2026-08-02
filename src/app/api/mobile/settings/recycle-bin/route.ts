import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { canAddEmployee } from '@/services/subscriptions/canAddEmployee'
import { requireActiveSubscription } from '@/lib/auth'
import { PLANS } from '@/constants/plans'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'

type Category = 'customers' | 'orders' | 'itemTypes' | 'services' | 'employees'

/**
 * Mirrors services/{customers,orders,items,services,employees}/getDeleted*.ts,
 * combined (same as the website's tabbed recycle-bin page), via the admin
 * client — all five already take laundryId directly but use the
 * cookie-session client internally.
 */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: custRows }, { data: orderRows }, { data: itemRows }, { data: serviceRows }, { data: empRows }] = await Promise.all([
    admin.from('customers').select('id, first_name, last_name, phone, deleted_at').eq('laundry_id', profile.laundryId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    admin.from('orders').select('id, order_number, status, total, deleted_at, customers(first_name, last_name)').eq('laundry_id', profile.laundryId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    admin.from('item_types').select('id, name, deleted_at').eq('laundry_id', profile.laundryId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    admin.from('services').select('id, name, deleted_at').eq('laundry_id', profile.laundryId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    admin.from('employees').select('id, first_name, last_name, role, deleted_at').eq('laundry_id', profile.laundryId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
  ])

  const customers = (custRows ?? []).map(r => ({
    id: r.id,
    firstName: decryptField(r.first_name) ?? '',
    lastName: decryptField(r.last_name) ?? '',
    phone: decryptField(r.phone) ?? '',
    deletedAt: r.deleted_at as string,
  }))

  const orders = (orderRows ?? []).map(r => {
    const cust = r.customers as unknown as { first_name: string; last_name: string } | null
    return {
      id: r.id,
      orderNumber: r.order_number,
      status: r.status,
      total: Number(r.total),
      customerName: cust ? `${decryptField(cust.first_name) ?? ''} ${decryptField(cust.last_name) ?? ''}`.trim() : '—',
      deletedAt: r.deleted_at as string,
    }
  })

  const itemTypes = (itemRows ?? []).map(r => ({ id: r.id, name: r.name, deletedAt: r.deleted_at as string }))
  const services = (serviceRows ?? []).map(r => ({ id: r.id, name: r.name, deletedAt: r.deleted_at as string }))
  const employees = (empRows ?? []).map(r => ({ id: r.id, firstName: r.first_name, lastName: r.last_name, role: r.role, deletedAt: r.deleted_at as string }))

  return NextResponse.json({ customers, orders, itemTypes, services, employees })
}

interface Body {
  category?: Category
  id?: string
}

/** Mirrors restoreCustomer.ts/restoreOrder.ts/restoreItemType.ts/restoreService.ts/restoreEmployee.ts via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as Body | null
  const category = body?.category
  const id = body?.id
  if (!category || !id) return NextResponse.json({ error: 'category and id are required.' }, { status: 400 })

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return NextResponse.json({ error: subCheck.error }, { status: 400 })

  const admin = createAdminClient()

  if (category === 'customers') {
    const { error } = await admin.from('customers').update({ deleted_at: null }).eq('id', id).eq('laundry_id', profile.laundryId)
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'This phone number is now used by another customer.' }, { status: 409 })
      return NextResponse.json({ error: 'Failed to restore customer.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (category === 'orders') {
    const { error } = await admin.from('orders').update({ deleted_at: null }).eq('id', id).eq('laundry_id', profile.laundryId)
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'This pickup code is now used by another order.' }, { status: 409 })
      return NextResponse.json({ error: 'Failed to restore order.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  // Item types, services, and employees are admin-only restores on the website.
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (category === 'itemTypes') {
    const { error } = await admin.from('item_types').update({ deleted_at: null }).eq('id', id).eq('laundry_id', profile.laundryId)
    if (error) return NextResponse.json({ error: 'Failed to restore item type.' }, { status: 500 })
    revalidateTag(`reference-data-${profile.laundryId}`)
    return NextResponse.json({ success: true })
  }

  if (category === 'services') {
    const { error } = await admin.from('services').update({ deleted_at: null }).eq('id', id).eq('laundry_id', profile.laundryId)
    if (error) return NextResponse.json({ error: 'Failed to restore service.' }, { status: 500 })
    revalidateTag(`reference-data-${profile.laundryId}`)
    return NextResponse.json({ success: true })
  }

  if (category === 'employees') {
    const subscription = await getActiveSubscription(profile.laundryId)
    const limit = subscription?.employeeLimit ?? PLANS.starter.employeeLimit
    if (!(await canAddEmployee(profile.laundryId, limit))) {
      return NextResponse.json(
        { error: `Your ${subscription?.plan ?? 'current'} plan allows up to ${limit} employees. Upgrade to add more.` },
        { status: 400 }
      )
    }
    const { error } = await admin.from('employees').update({ deleted_at: null, is_active: true }).eq('id', id).eq('laundry_id', profile.laundryId)
    if (error) return NextResponse.json({ error: 'Failed to restore employee.' }, { status: 500 })

    await admin.from('activity_logs').insert({
      laundry_id: profile.laundryId,
      employee_id: profile.employeeId,
      target_employee_id: id,
      action_type: ACTIVITY_ACTION_TYPES.EMPLOYEE_RESTORED,
      description: 'Employee restored to the team',
    })
    revalidateTag('employee-profile')
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
}
