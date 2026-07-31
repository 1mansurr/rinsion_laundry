'use server'

import { createClient, createAdminClient } from '@/lib/supabase'
import { toAuthPhone } from '@/utils/toAuthPhone'
import { encryptField, computeBlindIndex } from '@/lib/crypto'
import { hashInviteToken } from '@/utils/inviteToken'
import type { ServiceResult } from '@/types/serviceResult'

const MAX_CODE_ATTEMPTS = 5

export interface VerifyOtpInput {
  phone: string
  code: string
  /**
   * Set as the account's real sign-in password (or reset onto it, for a
   * repeat verify) — this flow doubles as both first-time signup and
   * forgot-password recovery, matching acceptInvite.ts's 8-char minimum.
   */
  password: string
  /** Only used when this phone has no existing customer_accounts row yet. */
  firstName?: string
  lastName?: string
}

/**
 * Public/unauthenticated — possession of the phone's most recent unexpired
 * code is the authorization, same principle as verifyPhoneResetCode
 * (services/auth/phoneReset.ts). First-time verify creates the auth user +
 * customer_accounts row; repeat verify (only reached via the "use a text
 * code instead" recovery path — see signInWithPassword.ts for normal
 * sign-in) resets the password on the existing one. Neither path touches
 * Supabase's native phone-OTP.
 */
export async function verifyOtp(input: VerifyOtpInput): Promise<ServiceResult<{ signedIn: boolean; isNewAccount: boolean }>> {
  const phone = toAuthPhone(input.phone)
  const code = input.code.trim()
  if (!phone) return { success: false, error: 'Enter a valid phone number.' }
  if (!/^\d{6}$/.test(code)) return { success: false, error: 'Enter the 6-digit code.' }
  if (input.password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' }

  const admin = createAdminClient()
  const phoneBidx = computeBlindIndex(phone)

  const { data: otpRow } = await admin
    .from('customer_otp_codes')
    .select('id, code_hash, expires_at, used_at, attempts')
    .eq('phone_bidx', phoneBidx)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!otpRow) return { success: false, error: 'This code has expired. Request a new one.' }
  if (new Date(otpRow.expires_at) < new Date()) return { success: false, error: 'This code has expired. Request a new one.' }
  if (otpRow.attempts >= MAX_CODE_ATTEMPTS) return { success: false, error: 'Too many incorrect attempts. Request a new code.' }

  if (hashInviteToken(code) !== otpRow.code_hash) {
    await admin.from('customer_otp_codes').update({ attempts: otpRow.attempts + 1 }).eq('id', otpRow.id)
    return { success: false, error: 'Incorrect code.' }
  }

  await admin.from('customer_otp_codes').update({ used_at: new Date().toISOString() }).eq('id', otpRow.id)

  const { data: existingAccount } = await admin
    .from('customer_accounts')
    .select('auth_user_id')
    .eq('phone_bidx', phoneBidx)
    .is('deleted_at', null)
    .maybeSingle()

  let isNewAccount = false

  if (existingAccount) {
    const { error: authErr } = await admin.auth.admin.updateUserById(existingAccount.auth_user_id, { password: input.password })
    if (authErr) return { success: false, error: authErr.message }
  } else {
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      phone,
      password: input.password,
      phone_confirm: true,
    })
    if (authErr || !authData.user) return { success: false, error: authErr?.message ?? 'Failed to create account.' }

    const { error: insertErr } = await admin.from('customer_accounts').insert({
      auth_user_id: authData.user.id,
      phone: encryptField(phone),
      phone_bidx: phoneBidx,
      first_name: input.firstName?.trim() ? encryptField(input.firstName.trim()) : null,
      last_name: input.lastName?.trim() ? encryptField(input.lastName.trim()) : null,
    })
    if (insertErr) return { success: false, error: insertErr.message }

    isNewAccount = true
  }

  const sessionClient = createClient()
  const { error: signInErr } = await sessionClient.auth.signInWithPassword({ phone, password: input.password })

  return { success: true, data: { signedIn: !signInErr, isNewAccount } }
}
