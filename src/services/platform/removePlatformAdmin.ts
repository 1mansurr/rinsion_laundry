'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import type { ServiceResult } from '@/types/serviceResult'

export async function removePlatformAdmin(platformAdminId: string): Promise<ServiceResult<null>> {
  const callerId = await requirePlatformAdmin()
  if (!callerId) return { success: false, error: 'Unauthorized.' }
  if (callerId === platformAdminId) return { success: false, error: 'You cannot remove your own access.' }

  const admin = createAdminClient()
  const { error } = await admin.from('platform_admins').delete().eq('id', platformAdminId)
  if (error) return { success: false, error: error.message }

  return { success: true, data: null }
}
