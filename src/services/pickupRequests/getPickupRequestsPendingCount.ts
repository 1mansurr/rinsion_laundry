'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'

export async function getPickupRequestsPendingCount(): Promise<number> {
  const profile = await getMyProfile()
  if (!profile) return 0

  const supabase = createClient()
  const { count } = await supabase
    .from('pickup_requests')
    .select('id', { count: 'exact', head: true })
    .eq('laundry_id', profile.laundryId)
    .in('approval_status', ['pending', 'delayed'])

  return count ?? 0
}
