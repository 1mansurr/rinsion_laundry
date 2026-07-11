'use server'

import { createClient } from '@/lib/supabase'
import { toAuthPhone } from '@/utils/toAuthPhone'
import type { ServiceResult } from '@/types/serviceResult'

export type SignInInput =
  | { phone: string; password: string }
  | { email: string; password: string }

export async function signIn(input: SignInInput): Promise<ServiceResult<null>> {
  const supabase = createClient()

  if ('phone' in input) {
    const phone = toAuthPhone(input.phone)
    if (!phone) return { success: false, error: 'Enter a valid phone number.' }

    const { error } = await supabase.auth.signInWithPassword({ phone, password: input.password })
    if (error) return { success: false, error: 'Invalid phone or password.' }
    return { success: true, data: null }
  }

  const email = input.email.trim()
  const { error } = await supabase.auth.signInWithPassword({ email, password: input.password })
  if (error) return { success: false, error: 'Invalid email or password.' }
  return { success: true, data: null }
}
