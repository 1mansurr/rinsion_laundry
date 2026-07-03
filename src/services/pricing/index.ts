'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'
import type { PricingMode } from '@/constants/statuses'

export interface PriceCell {
  id: string
  itemTypeId: string
  serviceId: string
  price: number
  pricingMode: PricingMode
  isActive: boolean
}

export async function getPricingMatrix(laundryId: string): Promise<PriceCell[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('item_service_prices')
    .select('id, item_type_id, service_id, price, pricing_mode, is_active')
    .eq('laundry_id', laundryId)

  return (data ?? []).map(r => ({
    id: r.id,
    itemTypeId: r.item_type_id,
    serviceId: r.service_id,
    price: Number(r.price),
    pricingMode: r.pricing_mode,
    isActive: r.is_active,
  }))
}

export async function upsertPrice(
  itemTypeId: string,
  serviceId: string,
  price: number,
  pricingMode: PricingMode = 'per_item'
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('laundry_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!emp || emp.role !== 'admin') return { success: false, error: 'Admin only.' }

  const { error } = await supabase
    .from('item_service_prices')
    .upsert(
      { laundry_id: emp.laundry_id, item_type_id: itemTypeId, service_id: serviceId, price, pricing_mode: pricingMode, is_active: true },
      { onConflict: 'laundry_id,item_type_id,service_id' }
    )

  if (error) return { success: false, error: error.message }

  revalidatePath('/items-and-services')
  return { success: true, data: null }
}

export async function togglePrice(id: string, isActive: boolean): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase
    .from('item_service_prices')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/items-and-services')
  return { success: true, data: null }
}
