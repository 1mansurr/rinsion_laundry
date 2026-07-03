'use server'

import { createClient, createAdminClient } from '@/lib/supabase'
import type { ServiceResult } from '@/types/serviceResult'

export interface MyJoinRequestStatus {
  status: 'pending' | 'approved' | 'rejected'
  laundryName: string
}

export async function submitJoinRequest(pin: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: existingEmployee } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (existingEmployee) return { success: false, error: 'You already belong to a laundry.' }

  // A non-employee has no RLS access to laundries at all — this narrow,
  // single-row lookup by exact PIN is the same class of bootstrapping
  // exception as self-serve laundry creation.
  const admin = createAdminClient()
  const { data: laundry } = await admin
    .from('laundries')
    .select('id, name')
    .eq('join_pin', pin.trim())
    .maybeSingle()
  if (!laundry) return { success: false, error: 'Invalid PIN. Check with your laundry admin and try again.' }

  const { data: pending } = await supabase
    .from('join_requests')
    .select('id')
    .eq('laundry_id', laundry.id)
    .eq('auth_user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (pending) return { success: true, data: null }

  const firstName = (user.user_metadata?.first_name as string | undefined) ?? ''
  const lastName = (user.user_metadata?.last_name as string | undefined) ?? ''
  const phone = (user.user_metadata?.phone as string | undefined) ?? ''

  const { error } = await supabase.from('join_requests').insert({
    laundry_id: laundry.id,
    laundry_name: laundry.name,
    auth_user_id: user.id,
    first_name: firstName,
    last_name: lastName,
    email: user.email,
    phone,
  })
  if (error) return { success: false, error: error.message }

  return { success: true, data: null }
}

export async function getMyJoinRequestStatus(): Promise<MyJoinRequestStatus | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('join_requests')
    .select('status, laundry_name, created_at')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return {
    status: data.status as 'pending' | 'approved' | 'rejected',
    laundryName: data.laundry_name,
  }
}
