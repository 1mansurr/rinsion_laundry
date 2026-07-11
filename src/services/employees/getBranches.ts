'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'

export async function getBranches(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return []

  const { data } = await supabase
    .from('branches')
    .select('id, name')
    .eq('laundry_id', profile.laundryId)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({ id: r.id, name: r.name }))
}
