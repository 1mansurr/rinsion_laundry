'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import type { PricingModel } from '@/constants/statuses'

export interface LaundrySettings {
  allowPartialPayments: boolean
  allowExpressOrders: boolean
  requirePickupCode: boolean
  allowCustomerSubmissions: boolean
  pricingModel: PricingModel
  taxRate: number
}

export async function getSettings(): Promise<LaundrySettings | null> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return null

  const { data } = await supabase
    .from('settings')
    .select('allow_partial_payments, allow_express_orders, require_pickup_code, allow_customer_submissions, pricing_model, tax_rate')
    .eq('laundry_id', profile.laundryId)
    .single()

  if (!data) return null
  return {
    allowPartialPayments: data.allow_partial_payments,
    allowExpressOrders: data.allow_express_orders,
    requirePickupCode: data.require_pickup_code,
    allowCustomerSubmissions: data.allow_customer_submissions,
    pricingModel: data.pricing_model,
    taxRate: Number(data.tax_rate),
  }
}
