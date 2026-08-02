import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMobileEmployeeProfile } from '@/services/mobile/getMobileEmployeeProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { generateInviteToken } from '@/utils/inviteToken'
import { getBaseUrl } from '@/utils/getBaseUrl'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'

interface Params {
  params: { id: string }
}

const RESEND_COOLDOWN_MS = 30 * 1000
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

/** Mirrors services/employees/resendInvite.ts via the admin client. */
export async function POST(request: NextRequest, { params }: Params) {
  const profile = await getMobileEmployeeProfile(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return NextResponse.json({ error: subCheck.error }, { status: 400 })

  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('pending_invites')
    .select('id, phone, expires_at, accepted_at')
    .eq('id', params.id)
    .eq('laundry_id', profile.laundryId)
    .maybeSingle()
  if (!invite) return NextResponse.json({ error: 'Invite not found.' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'This invite has already been accepted.' }, { status: 409 })

  const lastSentAt = new Date(invite.expires_at).getTime() - INVITE_LIFETIME_MS
  if (Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
    return NextResponse.json({ error: 'Please wait before resending this invite.' }, { status: 429 })
  }

  const { token, tokenHash } = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS).toISOString()

  const { error } = await admin
    .from('pending_invites')
    .update({ token_hash: tokenHash, expires_at: expiresAt })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Failed to resend invite.' }, { status: 500 })

  await admin.from('activity_logs').insert({
    laundry_id: profile.laundryId,
    employee_id: profile.employeeId,
    action_type: ACTIVITY_ACTION_TYPES.INVITE_RESENT,
    description: 'Invite resent',
  })

  const { data: laundry } = await admin.from('laundries').select('name').eq('id', profile.laundryId).single()
  const baseUrl = getBaseUrl()
  import('@/services/notifications/sendSms')
    .then(m => m.sendSystemSms({
      laundryId: profile.laundryId,
      phone: invite.phone,
      message: `${laundry?.name ?? 'Your laundry'} added you as staff on Rinsion. Set your password: ${baseUrl}/i/${token}`,
      triggerEvent: 'EMPLOYEE_INVITE',
    }))
    .catch(() => null)

  return NextResponse.json({ success: true })
}
