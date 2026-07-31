'use server'

import { createClient } from '@/lib/supabase'
import { getMyRiderProfile } from '@/services/riders/getMyRiderProfile'

export async function getUnreadNotificationCount(): Promise<number> {
  const profile = await getMyRiderProfile()
  if (!profile) return 0

  const supabase = createClient()
  const { count } = await supabase
    .from('rider_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('rider_id', profile.id)
    .is('read_at', null)

  return count ?? 0
}
