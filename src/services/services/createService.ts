'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole, requireActiveSubscription } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ROLES } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'
import type { LaundryService } from './getServices'

export async function createService(name: string): Promise<ServiceResult<LaundryService>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, ROLES.ADMIN)
  if (!check.success) return check
  const emp = { laundry_id: check.data.laundryId }

  const subCheck = await requireActiveSubscription(emp.laundry_id)
  if (!subCheck.success) return subCheck

  // New services in a fully weight-based laundry default to per_kg too;
  // 'mixed' and 'per_item' laundries default new services to per_item.
  const { data: settings } = await supabase
    .from('settings')
    .select('pricing_model')
    .eq('laundry_id', emp.laundry_id)
    .single()
  const pricingMode = settings?.pricing_model === 'per_kg' ? 'per_kg' : 'per_item'

  const { data, error } = await supabase
    .from('services')
    .insert({ laundry_id: emp.laundry_id, name: name.trim(), pricing_mode: pricingMode })
    .select('id, name, is_active, pricing_mode, min_kg_rate, max_kg_rate, notes')
    .single()

  if (error) return { success: false, error: error.message }

  revalidateTag(`reference-data-${emp.laundry_id}`)
  revalidatePath('/items-and-services')
  return {
    success: true,
    data: {
      id: data.id,
      name: data.name,
      isActive: data.is_active,
      pricingMode: data.pricing_mode,
      minKgRate: data.min_kg_rate === null ? null : Number(data.min_kg_rate),
      maxKgRate: data.max_kg_rate === null ? null : Number(data.max_kg_rate),
      notes: data.notes,
    },
  }
}
