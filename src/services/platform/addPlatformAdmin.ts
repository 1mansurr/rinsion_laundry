'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { toAuthPhone } from '@/utils/toAuthPhone'
import type { ServiceResult } from '@/types/serviceResult'

export interface AddPlatformAdminInput {
  email?: string
  phone?: string
}

/**
 * Only resolves an *existing* Rinsion auth account — this never creates one.
 * The person must already have signed in at least once (as an employee or
 * another platform admin) before they can be promoted.
 */
export async function addPlatformAdmin(input: AddPlatformAdminInput): Promise<ServiceResult<null>> {
  const callerId = await requirePlatformAdmin()
  if (!callerId) return { success: false, error: 'Unauthorized.' }

  const email = input.email?.trim() || null
  const phone = input.phone?.trim() ? toAuthPhone(input.phone.trim()) : null
  if (!email && !phone) return { success: false, error: 'Enter an email or phone number.' }
  if (input.phone?.trim() && !phone) return { success: false, error: 'Enter a valid phone number.' }

  const admin = createAdminClient()

  let authUserId: string | null = null
  if (phone) {
    const { data } = await admin.rpc('get_auth_user_by_phone', { p_phone: phone })
    authUserId = data ?? null
  }
  if (!authUserId && email) {
    const { data } = await admin.rpc('get_auth_user_by_email', { p_email: email })
    authUserId = data ?? null
  }

  if (!authUserId) return { success: false, error: 'No Rinsion account found with that email or phone.' }

  const { error } = await admin.from('platform_admins').insert({ auth_user_id: authUserId })
  if (error) {
    if (error.code === '23505') return { success: false, error: 'This person is already a platform admin.' }
    return { success: false, error: error.message }
  }

  return { success: true, data: null }
}
