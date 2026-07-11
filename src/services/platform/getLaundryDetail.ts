'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'

export interface LaundryDetail {
  id: string
  name: string
  laundryCode: string
  createdAt: string
  subscription: { plan: string; status: string; cycleStartDate: string; cycleEndDate: string } | null
  admins: { id: string; firstName: string; lastName: string; phone: string }[]
  pendingInvites: { id: string; phone: string; role: string; createdAt: string; expiresAt: string }[]
}

export async function getLaundryDetail(laundryId: string): Promise<LaundryDetail | null> {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) return null

  const admin = createAdminClient()

  const { data: laundry } = await admin
    .from('laundries')
    .select('id, name, laundry_code, created_at')
    .eq('id', laundryId)
    .maybeSingle()
  if (!laundry) return null

  const [{ data: sub }, { data: admins }, { data: invites }] = await Promise.all([
    admin.from('subscriptions').select('plan, status, cycle_start_date, cycle_end_date')
      .eq('laundry_id', laundryId).neq('status', 'cancelled')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('employees').select('id, first_name, last_name, phone').eq('laundry_id', laundryId).eq('role', 'admin'),
    admin.from('pending_invites').select('id, phone, role, created_at, expires_at')
      .eq('laundry_id', laundryId).is('accepted_at', null),
  ])

  return {
    id: laundry.id,
    name: laundry.name,
    laundryCode: laundry.laundry_code,
    createdAt: laundry.created_at,
    subscription: sub
      ? { plan: sub.plan, status: sub.status, cycleStartDate: sub.cycle_start_date, cycleEndDate: sub.cycle_end_date }
      : null,
    admins: (admins ?? []).map(a => ({ id: a.id, firstName: a.first_name, lastName: a.last_name, phone: a.phone })),
    pendingInvites: (invites ?? []).map(i => ({
      id: i.id, phone: i.phone, role: i.role, createdAt: i.created_at, expiresAt: i.expires_at,
    })),
  }
}
