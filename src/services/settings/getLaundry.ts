'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'

export async function getLaundry(): Promise<{ id: string; name: string; laundryCode: string; joinPin: string } | null> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return null

  const { data } = await supabase
    .from('laundries')
    .select('id, name, laundry_code, join_pin')
    .eq('id', profile.laundryId)
    .single()

  if (!data) return null
  return { id: data.id, name: data.name, laundryCode: data.laundry_code, joinPin: data.join_pin }
}
