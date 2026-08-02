import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { getSoleBranchId } from '@/services/branches/getSoleBranchId'
import { requireActiveSubscription } from '@/lib/auth'
import { getActiveSubscription } from '@/services/subscriptions/getActive'
import { canAddEmployee } from '@/services/subscriptions/canAddEmployee'
import { PLANS } from '@/constants/plans'
import { ROLES, JOIN_REQUEST_STATUS } from '@/constants/statuses'
import type { EmployeeRole } from '@/constants/statuses'

interface Params {
  params: { id: string }
}

/** Mirrors services/laundries/approveJoinRequest.ts and rejectJoinRequest.ts, combined via an `action` field, via the admin client. */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null) as { action?: 'approve' | 'reject'; role?: EmployeeRole } | null
  const action = body?.action
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject".' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: joinRequest } = await admin
    .from('join_requests')
    .select('id, auth_user_id, first_name, last_name, email, phone, status')
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)
    .single()
  if (!joinRequest) return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
  if (joinRequest.status !== JOIN_REQUEST_STATUS.PENDING) {
    return NextResponse.json({ error: 'This request has already been resolved.' }, { status: 409 })
  }

  if (action === 'reject') {
    const { error } = await admin
      .from('join_requests')
      .update({ status: JOIN_REQUEST_STATUS.REJECTED, resolved_at: new Date().toISOString(), resolved_by_employee_id: profile.employeeId })
      .eq('id', params.id)
      .eq('laundry_id', profile.laundryId)
    if (error) return NextResponse.json({ error: 'Failed to reject request.' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const role = body?.role
  if (!role) return NextResponse.json({ error: 'role is required to approve.' }, { status: 400 })

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return NextResponse.json({ error: subCheck.error }, { status: 400 })

  const subscription = await getActiveSubscription(profile.laundryId)
  const limit = subscription?.employeeLimit ?? PLANS.starter.employeeLimit
  if (!(await canAddEmployee(profile.laundryId, limit))) {
    return NextResponse.json(
      { error: `Your ${subscription?.plan ?? 'current'} plan allows up to ${limit} employees. Upgrade to add more.` },
      { status: 400 }
    )
  }

  const branchId = await getSoleBranchId(profile.laundryId, admin)
  if (!branchId) return NextResponse.json({ error: 'No branch found for this laundry.' }, { status: 400 })

  // join_requests.email/phone are already ciphertext under the same
  // FIELD_ENCRYPTION_KEY — copied straight through, same as approveJoinRequest.ts.
  const { data: newEmployee, error: empErr } = await admin
    .from('employees')
    .insert({
      auth_user_id: joinRequest.auth_user_id,
      laundry_id: profile.laundryId,
      branch_id: branchId,
      role,
      first_name: joinRequest.first_name,
      last_name: joinRequest.last_name,
      email: joinRequest.email,
      phone: joinRequest.phone,
    })
    .select('id')
    .single()
  if (empErr) return NextResponse.json({ error: 'Failed to create employee.' }, { status: 500 })

  const { error: reqErr } = await admin
    .from('join_requests')
    .update({ status: JOIN_REQUEST_STATUS.APPROVED, resolved_at: new Date().toISOString(), resolved_by_employee_id: profile.employeeId })
    .eq('id', params.id)
  if (reqErr) return NextResponse.json({ error: 'Failed to update request.' }, { status: 500 })

  await admin.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    employee_id: profile.employeeId,
    target_employee_id: newEmployee.id,
    action_type: 'EMPLOYEE_CREATED',
    description: 'Employee joined via request',
  })

  return NextResponse.json({ success: true })
}
