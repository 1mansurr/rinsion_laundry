'use server'

import { createAdminClient } from '@/lib/supabase'
import { toAuthPhone } from '@/utils/toAuthPhone'
import { generateResetCode, hashInviteToken } from '@/utils/inviteToken'
import { signIn } from '@/services/auth/signIn'
import { sendSystemSms } from '@/services/notifications/sendSms'
import { ACTIVITY_ACTION_TYPES } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

const MAX_CODE_ATTEMPTS = 5

/**
 * Public/unauthenticated. Mirrors createInvite's hashed-token pattern rather
 * than Supabase's native phone-OTP, which would need a second SMS provider
 * configured in the Supabase dashboard alongside mNotify (docs/auth_spec.md §1).
 * Always returns success regardless of whether the phone matched an account —
 * same enumeration-protection principle as forgot-password/actions.ts's email flow.
 *
 * Delivers a 6-digit code (not a link) — the caller (PhoneResetFlow) awaits
 * this, so the SMS send below is awaited too rather than fired-and-forgotten:
 * a dangling promise here previously risked getting cut off mid-send once the
 * server action's response went out.
 */
export async function requestPhoneReset(rawPhone: string): Promise<ServiceResult<null>> {
  const phone = toAuthPhone(rawPhone)
  if (!phone) return { success: false, error: 'Enter a valid phone number.' }

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

    const { code, codeHash } = generateResetCode()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const { error } = await admin.from('password_reset_tokens').insert({
      auth_user_id: authUserId,
      token_hash: codeHash,
      expires_at: expiresAt,
    })

    // Only sendable if the phone still resolves to a live (non-removed) employee —
    // an orphaned auth user with no employee row has no laundry to bill the SMS to.
    if (!error && employee?.laundry_id) {
      await sendSystemSms({
        laundryId: employee.laundry_id,
        phone,
        message: `Your Rinsion password reset code is ${code}. It expires in 1 hour.`,
        triggerEvent: 'PASSWORD_RESET',
      }).catch(() => null)
    }
  }

  return { success: true, data: null }
}

export interface VerifyPhoneResetCodeInput {
  phone: string
  code: string
  password: string
}

/**
 * Public/unauthenticated — possession of the phone's most recent unexpired
 * code is the authorization. Runs entirely on the service-role client since
 * there is no session yet, same shape as acceptInvite.
 *
 * Attempts are capped well below the 1-hour expiry (MAX_CODE_ATTEMPTS) since
 * a 6-digit code is brute-forceable without a low attempt limit.
 */
export async function verifyPhoneResetCode(input: VerifyPhoneResetCodeInput): Promise<ServiceResult<{ signedIn: boolean }>> {
  if (input.password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' }

  const phone = toAuthPhone(input.phone)
  const code = input.code.trim()
  if (!phone || !/^\d{6}$/.test(code)) return { success: false, error: 'Invalid code or phone number.' }

  const admin = createAdminClient()

  const { data: authUserId } = await admin.rpc('get_auth_user_by_phone', { p_phone: phone })
  if (!authUserId) return { success: false, error: 'Invalid code or phone number.' }

  const { data: resetToken } = await admin
    .from('password_reset_tokens')
    .select('id, token_hash, expires_at, used_at, attempts')
    .eq('auth_user_id', authUserId)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!resetToken) return { success: false, error: 'This code has expired. Request a new one.' }
  if (new Date(resetToken.expires_at) < new Date()) return { success: false, error: 'This code has expired. Request a new one.' }
  if (resetToken.attempts >= MAX_CODE_ATTEMPTS) return { success: false, error: 'Too many incorrect attempts. Request a new code.' }

  if (hashInviteToken(code) !== resetToken.token_hash) {
    await admin
      .from('password_reset_tokens')
      .update({ attempts: resetToken.attempts + 1 })
      .eq('id', resetToken.id)
    return { success: false, error: 'Incorrect code.' }
  }

  const { data: authData, error: authErr } = await admin.auth.admin.updateUserById(authUserId, {
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
    .eq('auth_user_id', authUserId)
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
