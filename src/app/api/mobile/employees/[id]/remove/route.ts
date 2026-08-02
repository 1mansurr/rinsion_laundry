import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'

interface Params {
  params: { id: string }
}

/** Mirrors services/employees/removeEmployee.ts (soft-unlink, reversible via the website's Recycle Bin) via the admin client. */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (profile.employeeId === params.id) return NextResponse.json({ error: 'Use "Delete my account" on the website to remove yourself.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('employees')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)
  if (error) return NextResponse.json({ error: 'Failed to remove employee.' }, { status: 500 })

  await admin.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    employee_id: profile.employeeId,
    target_employee_id: params.id,
    action_type: ACTIVITY_ACTION_TYPES.EMPLOYEE_REMOVED,
    description: 'Employee removed from the team',
  })

  revalidateTag('employee-profile')
  return NextResponse.json({ success: true })
}
