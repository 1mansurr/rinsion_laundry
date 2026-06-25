'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export interface LaundryService {
  id: string
  name: string
  isActive: boolean
}

export async function getServices(laundryId: string): Promise<LaundryService[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('services')
    .select('id, name, is_active')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('name')

  return (data ?? []).map(r => ({ id: r.id, name: r.name, isActive: r.is_active }))
}

export async function createService(name: string): Promise<ServiceResult<LaundryService>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('laundry_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!emp || emp.role !== 'admin') return { success: false, error: 'Admin only.' }

  const { data, error } = await supabase
    .from('services')
    .insert({ laundry_id: emp.laundry_id, name: name.trim() })
    .select('id, name, is_active')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/items-and-services')
  return { success: true, data: { id: data.id, name: data.name, isActive: data.is_active } }
}

export async function toggleService(id: string, isActive: boolean): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/items-and-services')
  return { success: true, data: null }
}
