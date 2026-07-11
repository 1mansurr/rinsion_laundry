'use server'

import { createAdminClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'

export interface PlatformAdminRow {
  id: string
  authUserId: string
  email: string | null
  phone: string | null
  createdAt: string
}

export async function listPlatformAdmins(): Promise<PlatformAdminRow[]> {
  const callerId = await requirePlatformAdmin()
  if (!callerId) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_admins')
    .select('id, auth_user_id, created_at')
    .order('created_at', { ascending: true })

  if (!data || data.length === 0) return []

  return Promise.all(data.map(async row => {
    const { data: userData } = await admin.auth.admin.getUserById(row.auth_user_id)
    return {
      id: row.id,
      authUserId: row.auth_user_id,
      email: userData?.user?.email ?? null,
      phone: userData?.user?.phone ?? null,
      createdAt: row.created_at,
    }
  }))
}
