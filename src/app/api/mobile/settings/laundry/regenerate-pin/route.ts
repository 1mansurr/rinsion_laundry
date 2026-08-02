import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { generateJoinPin } from '@/utils/generateJoinPin'
import { ROLES } from '@/constants/statuses'

/** Mirrors services/settings/regenerateJoinPin.ts via the admin client. */
export async function POST(request: NextRequest) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const joinPin = generateJoinPin()
  const admin = createAdminClient()
  const { error } = await admin
    .from('laundries')
    .update({ join_pin: joinPin, updated_at: new Date().toISOString() })
    .eq('id', profile.laundryId)
  if (error) return NextResponse.json({ error: 'Failed to regenerate PIN.' }, { status: 500 })

  await admin.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    employee_id: profile.employeeId,
    action_type: 'SETTINGS_UPDATED',
    description: 'Join PIN regenerated',
  })

  return NextResponse.json({ joinPin })
}
