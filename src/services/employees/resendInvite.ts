'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole, requireActiveSubscription } from '@/lib/auth'
import { generateInviteToken } from '@/utils/inviteToken'
import { getBaseUrl } from '@/utils/getBaseUrl'
import { revalidatePath } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

const RESEND_COOLDOWN_MS = 30 * 1000
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

export async function resendInvite(inviteId: string): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const caller = check.data

  const subCheck = await requireActiveSubscription(caller.laundryId)
  if (!subCheck.success) return subCheck

  const supabase = createClient()
  const { data: invite } = await supabase
    .from('pending_invites')
    .select('id, phone, expires_at, accepted_at')
    .eq('id', inviteId)
    .eq('laundry_id', caller.laundryId)
    .maybeSingle()

  if (!invite) return { success: false, error: 'Invite not found.' }
  if (invite.accepted_at) return { success: false, error: 'This invite has already been accepted.' }

  // expires_at was set to sentAt + 7 days, so this recovers the last-sent time
  // without needing an extra column, and rate-limits accidental double-sends.
  const lastSentAt = new Date(invite.expires_at).getTime() - INVITE_LIFETIME_MS
  if (Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
    return { success: false, error: 'Please wait before resending this invite.' }
  }

  const { token, tokenHash } = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS).toISOString()

  const { error } = await supabase
    .from('pending_invites')
    .update({ token_hash: tokenHash, expires_at: expiresAt })
    .eq('id', inviteId)
  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: caller.laundryId,
    employee_id: caller.id,
    action_type: ACTIVITY_ACTION_TYPES.INVITE_RESENT,
    description: 'Invite resent',
  })

  const laundryName = caller.laundryName
  const baseUrl = getBaseUrl()
  import('@/services/notifications/sendSms')
    .then(m => m.sendSystemSms({
      laundryId: caller.laundryId,
      phone: invite.phone,
      message: `${laundryName} added you as staff on Rinsion. Set your password: ${baseUrl}/i/${token}`,
      triggerEvent: 'EMPLOYEE_INVITE',
    }))
    .catch(() => null)

  revalidatePath('/employees')
  return { success: true, data: null }
}
