'use server'

import { createClient } from '@/lib/supabase'

export interface DeletedService {
  id: string
  name: string
  deletedAt: string
}

export async function getDeletedServices(laundryId: string): Promise<DeletedService[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('services')
    .select('id, name, deleted_at')
    .eq('laundry_id', laundryId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  return (data ?? []).map(r => ({ id: r.id, name: r.name, deletedAt: r.deleted_at as string }))
}
