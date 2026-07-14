'use server'

import { createClient } from '@/lib/supabase'
import { toAuthPhone } from '@/utils/toAuthPhone'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * Sends a 6-digit SMS code via Supabase Auth's native phone-OTP mechanism.
 * shouldCreateUser: false so a mistyped/unregistered number errors out
 * instead of silently creating an orphaned auth user.
 *
 * Requires an SMS provider configured in the Supabase dashboard
 * (Authentication -> Providers -> Phone) — this call succeeds at the API
 * level regardless, but no SMS is actually delivered until that's set up.
 */
export async function requestPhoneReset(rawPhone: string): Promise<ServiceResult<null>> {
  const phone = toAuthPhone(rawPhone)
  if (!phone) return { success: false, error: 'Enter a valid phone number.' }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  })
  if (error) return { success: false, error: "Couldn't send a code to that number." }

  return { success: true, data: null }
}

/**
 * Verifies the code sent by requestPhoneReset. On success this establishes
 * a real session (verifyOtp is a sign-in primitive, not just a check) via
 * the request-bound client, so the caller can redirect straight to
 * /reset-password — its existing session-based updatePassword action needs
 * no changes to work here.
 */
export async function verifyPhoneReset(rawPhone: string, code: string): Promise<ServiceResult<null>> {
  const phone = toAuthPhone(rawPhone)
  if (!phone) return { success: false, error: 'Enter a valid phone number.' }
  if (!code.trim()) return { success: false, error: 'Enter the code we sent you.' }

  const supabase = createClient()
  const { error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' })
  if (error) return { success: false, error: 'Incorrect or expired code.' }

  return { success: true, data: null }
}
