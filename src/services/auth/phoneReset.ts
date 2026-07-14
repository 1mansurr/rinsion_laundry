'use server'

import { createAdminClient } from '@/lib/supabase'
import { toAuthPhone } from '@/utils/toAuthPhone'
import { getBaseUrl } from '@/utils/getBaseUrl'
import { generateInviteToken, hashInviteToken } from '@/utils/inviteToken'
import { signIn } from '@/services/auth/signIn'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Public/unauthenticated. Mirrors createInvite's hashed-token pattern rather
 * than Supabase's native phone-OTP, which would need a second SMS provider
 * configured in the Supabase dashboard alongside mNotify (docs/auth_spec.md §1).
 * Always returns success regardless of whether the phone matched an account —
 * same enumeration-protection principle as forgot-password/actions.ts's email flow.
 */
export async function requestPhoneReset(rawPhone: string): Promise<ServiceResult<null>> {
  const phone = toAuthPhone(rawPhone)
  if (!phone) return { success: false, error: 'Enter a valid phone number.' }

  // Captured synchronously — headers() isn't safe inside the deferred .then() below.
  const baseUrl = getBaseUrl()
  const admin = createAdminClient()

  const { data: authUserId } = await admin.rpc('get_auth_user_by_phone', { p_phone: phone })

  if (authUserId) {
    const { data: employee } = await admin
      .from('employees')
      .select('laundry_id')
      .eq('auth_user_id', authUserId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { token, tokenHash } = generateInviteToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const { error } = await admin.from('password_reset_tokens').insert({
      auth_user_id: authUserId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })

    // Only sendable if the phone still resolves to a live (non-removed) employee —
    // an orphaned auth user with no employee row has no laundry to bill the SMS to.
    if (!error && employee?.laundry_id) {
      import('@/services/notifications/sendSms')
        .then(m => m.sendSystemSms({
          laundryId: employee.laundry_id,
          phone,
          message: `Reset your Rinsion password: ${baseUrl}/reset/${token}`,
          triggerEvent: 'PASSWORD_RESET',
        }))
        .catch(() => null)
    }
  }

  return { success: true, data: null }
}

export interface ConfirmPhoneResetInput {
  token: string
  password: string
}

/**
 * Public/unauthenticated — possession of the token is the authorization.
 * Runs entirely on the service-role client since there is no session yet,
 * same shape as acceptInvite.
 */
export async function confirmPhoneReset(input: ConfirmPhoneResetInput): Promise<ServiceResult<{ signedIn: boolean }>> {
  if (input.password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' }

  const admin = createAdminClient()
  const tokenHash = hashInviteToken(input.token)

  const { data: resetToken } = await admin
    .from('password_reset_tokens')
    .select('id, auth_user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!resetToken) return { success: false, error: 'Invalid or expired reset link.' }
  if (resetToken.used_at) return { success: false, error: 'This reset link has already been used.' }
  if (new Date(resetToken.expires_at) < new Date()) return { success: false, error: 'This reset link has expired.' }

  const { data: authData, error: authErr } = await admin.auth.admin.updateUserById(resetToken.auth_user_id, {
    password: input.password,
  })
  if (authErr) return { success: false, error: authErr.message }

  await admin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', resetToken.id)

  const { data: employee } = await admin
    .from('employees')
    .select('id, laundry_id')
    .eq('auth_user_id', resetToken.auth_user_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (employee) {
    await admin.from('activity_logs').insert({
      laundry_id: employee.laundry_id,
      employee_id: employee.id,
      action_type: ACTIVITY_ACTION_TYPES.PASSWORD_RESET_COMPLETED,
      description: 'Password reset via phone',
    })
  }

  // Auto-sign-in, same pattern and same "caller must check signedIn" caveat as acceptInvite.
  if (authData.user.phone) {
    const signInResult = await signIn({ phone: authData.user.phone, password: input.password })
    return { success: true, data: { signedIn: signInResult.success } }
  }

  return { success: true, data: { signedIn: false } }
}
