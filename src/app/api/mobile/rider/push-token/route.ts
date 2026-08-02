import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileRiderProfile } from '@/services/mobile/getMobileRiderProfile'

/** Registers (or clears, on sign-out) the caller's Expo push token — one token per rider, last-registered-device wins. */
export async function POST(request: NextRequest) {
  const profile = await getMobileRiderProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { token?: string | null } | null
  if (body?.token === undefined) return NextResponse.json({ error: 'token is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('riders')
    .update({ expo_push_token: body.token })
    .eq('id', profile.riderId)
  if (error) return NextResponse.json({ error: 'Failed to save push token.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
