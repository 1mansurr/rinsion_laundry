'use server'

import { createClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { ROLES, JOIN_REQUEST_STATUS } from '@/constants/statuses'

export interface PendingJoinRequest {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  createdAt: string
}

export async function getPendingJoinRequests(): Promise<PendingJoinRequest[]> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile || profile.role !== ROLES.ADMIN) return []

  const { data } = await supabase
    .from('join_requests')
    .select('id, first_name, last_name, email, phone, created_at')
    .eq('laundry_id', profile.laundryId)
    .eq('status', JOIN_REQUEST_STATUS.PENDING)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: decryptField(r.email) ?? r.email,
    phone: decryptField(r.phone) ?? r.phone,
    createdAt: r.created_at,
  }))
}
