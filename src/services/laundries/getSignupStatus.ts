'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getVerifiedUserId } from '@/lib/auth'

export interface SignupStatus {
  authenticated: boolean
  hasEmployee: boolean
}

export async function getSignupStatus(): Promise<SignupStatus> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { authenticated: false, hasEmployee: false }

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  return { authenticated: true, hasEmployee: !!emp }
}

/**
 * Guards the Add Laundry / Join Laundry / choose steps: must be authenticated
 * (signed up already) but must not already belong to a laundry.
 */
export async function requireSignupInProgress(): Promise<void> {
  const status = await getSignupStatus()
  if (!status.authenticated) redirect('/signup')
  if (status.hasEmployee) redirect('/dashboard')
}
