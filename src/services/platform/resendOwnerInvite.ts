'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { generateInviteToken } from '@/utils/inviteToken'
import { getBaseUrl } from '@/utils/getBaseUrl'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

export async function resendOwnerInvite(inviteId: string): Promise<ServiceResult<null>> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return { success: false, error: 'Unauthorized.' }

  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('pending_invites')
    .select('id, laundry_id, phone, accepted_at')
    .eq('id', inviteId)
    .maybeSingle()

  if (!invite) return { success: false, error: 'Invite not found.' }
  if (invite.accepted_at) return { success: false, error: 'This invite has already been accepted.' }

  const { data: laundry } = await admin.from('laundries').select('name').eq('id', invite.laundry_id).single()

  const { token, tokenHash } = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS).toISOString()

  const { error } = await admin
    .from('pending_invites')
    .update({ token_hash: tokenHash, expires_at: expiresAt })
    .eq('id', inviteId)
  if (error) return { success: false, error: error.message }

  await admin.from('activity_logs').insert({
    laundry_id: invite.laundry_id,
    platform_admin_id: platformAdminId,
    action_type: ACTIVITY_ACTION_TYPES.INVITE_RESENT,
    description: `Owner invite resent to ${invite.phone}`,
  })

  const laundryName = laundry?.name ?? 'Rinsion'
  const baseUrl = getBaseUrl()
  import('@/services/notifications/sendSms')
    .then(m => m.sendSystemSms({
      laundryId: invite.laundry_id,
      phone: invite.phone,
      message: `${laundryName} is ready on Rinsion. Set your password: ${baseUrl}/i/${token}`,
      triggerEvent: 'EMPLOYEE_INVITE',
    }))
    .catch(() => null)

  return { success: true, data: null }
}
