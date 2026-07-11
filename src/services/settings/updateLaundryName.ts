'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export async function updateLaundryName(name: string): Promise<ServiceResult<null>> {
  if (!name.trim()) return { success: false, error: 'Name cannot be empty.' }

  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const emp = { id: check.data.id, laundry_id: check.data.laundryId }

  const { error } = await supabase
    .from('laundries')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', emp.laundry_id)

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    employee_id: emp.id,
    action_type: 'SETTINGS_UPDATED',
    description: `Laundry name changed to "${name.trim()}"`,
  })

  revalidatePath('/settings/laundry')
  revalidatePath('/dashboard')
  return { success: true, data: null }
}
