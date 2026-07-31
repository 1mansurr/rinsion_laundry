'use server'

import { createClient } from '@/lib/supabase'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'
import type { ServiceResult } from '@/types/serviceResult'

export async function markNotificationsRead(): Promise<ServiceResult<null>> {
  const profile = await getMyRiderProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const supabase = createClient()
  await supabase
    .from('rider_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('rider_id', profile.id)
    .is('read_at', null)

  return { success: true, data: null }
}
