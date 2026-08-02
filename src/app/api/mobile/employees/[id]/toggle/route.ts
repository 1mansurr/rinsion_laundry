import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { ROLES } from '@/constants/statuses'

interface Params {
  params: { id: string }
}

/** Mirrors services/employees/toggleEmployee.ts via the admin client. */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (profile.employeeId === params.id) return NextResponse.json({ error: 'Cannot deactivate your own account.' }, { status: 400 })

  const body = await request.json().catch(() => null) as { isActive?: boolean } | null
  if (typeof body?.isActive !== 'boolean') return NextResponse.json({ error: 'isActive is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('employees')
    .update({ is_active: body.isActive })
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)
  if (error) return NextResponse.json({ error: 'Failed to update employee.' }, { status: 500 })

  // Deactivation must take effect immediately on the website too, not after
  // getMyProfile()'s 5-minute cache TTL — same reasoning as toggleEmployee.ts.
  revalidateTag('employee-profile')
  return NextResponse.json({ success: true })
}
