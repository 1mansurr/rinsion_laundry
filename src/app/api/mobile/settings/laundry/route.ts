import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { ROLES } from '@/constants/statuses'

/** Mirrors services/settings/getLaundry.ts via the admin client. */
export async function GET(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin.from('laundries').select('id, name, laundry_code, join_pin').eq('id', profile.laundryId).single()
  if (!data) return NextResponse.json({ error: 'Laundry not found.' }, { status: 404 })

  return NextResponse.json({ laundry: { id: data.id, name: data.name, laundryCode: data.laundry_code, joinPin: data.join_pin } })
}

/** Mirrors services/settings/updateLaundryName.ts via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null) as { name?: string } | null
  const name = body?.name?.trim()
  if (!name) return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('laundries').update({ name, updated_at: new Date().toISOString() }).eq('id', profile.laundryId)
  if (error) return NextResponse.json({ error: 'Failed to update laundry name.' }, { status: 500 })

  await admin.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    employee_id: profile.employeeId,
    action_type: 'SETTINGS_UPDATED',
    description: `Laundry name changed to "${name}"`,
  })

  return NextResponse.json({ success: true })
}
