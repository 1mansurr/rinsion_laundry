import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { createInvite } from '@/services/employees/createInvite'
import { canAddEmployee } from '@/services/subscriptions/canAddEmployee'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { requireActiveSubscription } from '@/lib/auth'
import { getBaseUrl } from '@/utils/getBaseUrl'
import { PLANS } from '@/constants/plans'
import { ROLES, JOIN_REQUEST_STATUS } from '@/constants/statuses'
import type { EmployeeRole } from '@/constants/statuses'

/**
 * Mirrors employees/page.tsx's combined load (getEmployees + getPendingInvites
 * + getPendingJoinRequests + subscription limit) in one response — all three
 * website functions use the cookie-session client internally, so reimplemented
 * here against the admin client with explicit laundryId, same convention as
 * every other mobile route.
 */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: employeeRows }, { data: inviteRows }, joinRequestRows, subscription] = await Promise.all([
    admin
      .from('employees')
      .select('id, first_name, last_name, email, phone, role, is_active')
      .eq('laundry_id', profile.laundryId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    admin
      .from('pending_invites')
      .select('id, phone, role, created_at, expires_at')
      .eq('laundry_id', profile.laundryId)
      .is('accepted_at', null)
      .order('created_at', { ascending: true }),
    profile.role === ROLES.ADMIN
      ? admin
          .from('join_requests')
          .select('id, first_name, last_name, email, phone, created_at')
          .eq('laundry_id', profile.laundryId)
          .eq('status', JOIN_REQUEST_STATUS.PENDING)
          .order('created_at', { ascending: true })
          .then(r => r.data ?? [])
      : Promise.resolve([]),
    getActiveSubscription(profile.laundryId),
  ])

  const employees = (employeeRows ?? []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email ? decryptField(r.email) : null,
    phone: decryptField(r.phone) ?? '',
    role: r.role as EmployeeRole,
    isActive: r.is_active,
  }))

  const pendingInvites = (inviteRows ?? []).map(r => ({
    id: r.id,
    phone: r.phone,
    role: r.role as EmployeeRole,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }))

  const pendingJoinRequests = joinRequestRows.map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: decryptField(r.email) ?? r.email,
    phone: decryptField(r.phone) ?? r.phone,
    createdAt: r.created_at,
  }))

  const employeeLimit = subscription?.employeeLimit ?? PLANS.starter.employeeLimit
  const activeCount = employees.filter(e => e.isActive).length

  return NextResponse.json({ employees, pendingInvites, pendingJoinRequests, employeeLimit, activeCount })
}

/** Mirrors services/employees/inviteEmployee.ts, reusing createInvite/canAddEmployee/getActiveSubscription directly (none depend on a cookie session). */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return NextResponse.json({ error: subCheck.error }, { status: 400 })

  const body = await request.json().catch(() => null) as { phone?: string; role?: EmployeeRole } | null
  const phone = body?.phone?.trim()
  const role = body?.role
  if (!phone || !role) return NextResponse.json({ error: 'Phone and role are required.' }, { status: 400 })

  const subscription = await getActiveSubscription(profile.laundryId)
  const limit = subscription?.employeeLimit ?? PLANS.starter.employeeLimit
  if (!(await canAddEmployee(profile.laundryId, limit))) {
    return NextResponse.json(
      { error: `Your ${subscription?.plan ?? 'current'} plan allows up to ${limit} employees. Upgrade to add more.` },
      { status: 400 }
    )
  }

  const result = await createInvite(profile.laundryId, phone, role, profile.employeeId)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })

  const { linked } = result.data
  if (!linked) {
    const token = result.data.token
    const admin = createAdminClient()
    const { data: laundry } = await admin.from('laundries').select('name').eq('id', profile.laundryId).single()
    const baseUrl = getBaseUrl()
    import('@/services/notifications/sendSms')
      .then(m => m.sendSystemSms({
        laundryId: profile.laundryId,
        phone,
        message: `${laundry?.name ?? 'Your laundry'} added you as staff on Rinsion. Set your password: ${baseUrl}/i/${token}`,
        triggerEvent: 'EMPLOYEE_INVITE',
      }))
      .catch(() => null)
  }

  return NextResponse.json({ linked })
}
