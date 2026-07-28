'use server'

import { createAdminClient } from '@/lib/supabase'
import { toAuthPhone } from '@/utils/toAuthPhone'
import { encryptField, computeBlindIndex } from '@/lib/crypto'
import { generateResetCode } from '@/utils/inviteToken'
import { sendOtpSms } from './sendOtpSms'
import type { ServiceResult } from '@/types/serviceResult'

const CODE_TTL_MINUTES = 10

/**
 * Public/unauthenticated. Unlike requestPhoneReset (services/auth/phoneReset.ts),
 * there's no "does this phone already have an account" branch — any valid
 * phone can request a code, since a first-time verify is what creates the
 * customer_accounts row (see verifyOtp.ts). Still always returns success
 * regardless of send outcome, same enumeration-protection principle.
 */
export async function requestOtp(rawPhone: string): Promise<ServiceResult<null>> {
  const phone = toAuthPhone(rawPhone)
  if (!phone) return { success: false, error: 'Enter a valid phone number.' }

  const admin = createAdminClient()
  const phoneBidx = computeBlindIndex(phone)
  const { code, codeHash } = generateResetCode()
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString()

  await admin.from('customer_otp_codes').insert({
    phone: encryptField(phone),
    phone_bidx: phoneBidx,
    code_hash: codeHash,
    expires_at: expiresAt,
  })

  // Awaited (not fire-and-forget) — same reasoning as requestPhoneReset: a
  // dangling promise here risks being cut off mid-send once the server
  // action's response goes out.
  await sendOtpSms(phone, code)

  return { success: true, data: null }
}
