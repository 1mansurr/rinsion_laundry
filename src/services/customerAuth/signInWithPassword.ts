'use server'

import { createClient } from '@/lib/supabase'
import { toAuthPhone } from '@/utils/toAuthPhone'
import type { ServiceResult } from '@/types/serviceResult'

/**
 * The normal sign-in path once a customer has a password set (see
 * verifyOtp.ts) — no SMS sent. Falls back to the OTP flow (portal/login)
 * for first-time signup or a forgotten password.
 */
export async function signInWithPassword(rawPhone: string, password: string): Promise<ServiceResult<null>> {
  const phone = toAuthPhone(rawPhone)
  if (!phone) return { success: false, error: 'Enter a valid phone number.' }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ phone, password })
  if (error) return { success: false, error: 'Incorrect phone or password.' }

  return { success: true, data: null }
}
