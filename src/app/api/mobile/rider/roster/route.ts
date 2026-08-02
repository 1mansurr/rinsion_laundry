import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMobileRiderProfile } from '@/services/mobile/getMobileRiderProfile'
import { createRiderInvite } from '@/services/riders/createRiderInvite'
import { getBaseUrl } from '@/utils/getBaseUrl'
import { RIDER_ROLE } from '@/constants/statuses'
import type { RiderRole } from '@/constants/statuses'

/** Admin-only. Mirrors services/riders/getRoster.ts + getPendingRiderInvites.ts in one response, same as the web roster/page.tsx loading both. */
export async function GET(request: NextRequest) {
  const profile = await getMobileRiderProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== RIDER_ROLE.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: riderRows } = await admin
    .from('riders')
    .select('id, first_name, last_name, phone, role, is_active')
    .eq('rider_company_id', profile.riderCompanyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  const roster = (riderRows ?? []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: decryptField(r.phone) ?? '',
    role: r.role as RiderRole,
    isActive: r.is_active,
  }))

  const { data: inviteRows } = await admin
    .from('rider_invites')
    .select('id, phone, role, created_at, expires_at')
    .eq('rider_company_id', profile.riderCompanyId)
    .is('accepted_at', null)
    .order('created_at', { ascending: true })

  const pendingInvites = (inviteRows ?? []).map(r => ({
    id: r.id,
    phone: r.phone,
    role: r.role as RiderRole,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }))

  return NextResponse.json({ roster, pendingInvites })
}

/** Admin-only. Reuses services/riders/createRiderInvite.ts directly (it already takes explicit params rather than a cookie session), same as inviteRider.ts's wrapper — always invites as role 'rider'. */
export async function POST(request: NextRequest) {
  const profile = await getMobileRiderProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== RIDER_ROLE.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null) as { phone?: string } | null
  const phone = body?.phone?.trim()
  if (!phone) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })

  const result = await createRiderInvite(profile.riderCompanyId, phone, RIDER_ROLE.RIDER, profile.riderId)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })

  const inviteLink = result.data.linked ? null : `${getBaseUrl()}/ri/${result.data.token}`

  return NextResponse.json({ linked: result.data.linked, inviteLink })
}
