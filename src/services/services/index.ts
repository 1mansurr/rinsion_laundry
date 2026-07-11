'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'
import type { PricingMode } from '@/constants/statuses'

export interface LaundryService {
  id: string
  name: string
  isActive: boolean
  pricingMode: PricingMode
  /** Rate per kg, only meaningful when pricingMode is 'per_kg'. Null until set. */
  kgRate: number | null
}

export async function getServices(laundryId: string): Promise<LaundryService[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('services')
    .select('id, name, is_active, pricing_mode, kg_rate')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  return (data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    isActive: r.is_active,
    pricingMode: r.pricing_mode,
    kgRate: r.kg_rate === null ? null : Number(r.kg_rate),
  }))
}

export async function setServicePricing(
  serviceId: string,
  pricingMode: PricingMode,
  kgRate: number | null
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, 'admin')
  if (!check.success) return check

  const { error } = await supabase
    .from('services')
    .update({
      pricing_mode: pricingMode,
      kg_rate: pricingMode === 'per_kg' ? kgRate : null,
    })
    .eq('id', serviceId)
    .eq('laundry_id', check.data.laundryId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/items-and-services')
  revalidatePath('/orders/new')
  return { success: true, data: null }
}

export async function createService(name: string): Promise<ServiceResult<LaundryService>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  const check = requireRole(profile, 'admin')
  if (!check.success) return check
  const emp = { laundry_id: check.data.laundryId }

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
    .select('id, name, is_active, pricing_mode, kg_rate')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/items-and-services')
  return {
    success: true,
    data: {
      id: data.id,
      name: data.name,
      isActive: data.is_active,
      pricingMode: data.pricing_mode,
      kgRate: data.kg_rate === null ? null : Number(data.kg_rate),
    },
  }
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
