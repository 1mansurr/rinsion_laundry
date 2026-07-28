'use server'

import { createClient, createAdminClient } from '@/lib/supabase'
import { getMyCustomerProfile } from '@/services/customerAuth/getMyCustomerProfile'
import { validatePriceRanges } from '@/services/pricing/validatePriceRanges'
import { generatePickupCode } from '@/utils/generatePickupCode'
import { generateOrderNumber } from '@/utils/generateOrderNumber'
import type { PricingMode } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export interface SubmitCustomerOrderInput {
  laundryId: string
  notes?: string
  items: {
    /** Absent for per_kg lines */
    itemTypeId?: string
    serviceId: string
    quantity: number
    /**
     * Always the range ceiling (max_price / max_kg_rate) — a customer can't
     * pick a price within a range the way staff can, so the client always
     * computes this as the conservative estimate shown as "final price
     * confirmed by the laundry." Still re-validated server-side below via
     * the same helper createOrder.ts uses, as defense against a tampered
     * request.
     */
    unitPrice: number
    totalPrice: number
    pricingMode: PricingMode
  }[]
}

export async function submitCustomerOrder(
  input: SubmitCustomerOrderInput
): Promise<ServiceResult<{ orderId: string; orderNumber: string }>> {
  const profile = await getMyCustomerProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }
  if (input.items.length === 0) return { success: false, error: 'Add at least one item.' }

  // Runs via the admin client — item_service_prices/services have no
  // customer-read RLS policy (only staff tenant_isolation), unlike orders/
  // customers which do. See getLaundryByPublicSlug.ts for the same reasoning.
  const admin = createAdminClient()
  const priceError = await validatePriceRanges(admin, input.laundryId, input.items)
  if (priceError) return { success: false, error: priceError.error }

  const { data: settingsRow } = await admin
    .from('settings')
    .select('tax_rate')
    .eq('laundry_id', input.laundryId)
    .maybeSingle()

  const orderNumber = generateOrderNumber()
  const subtotal = input.items.reduce((s, i) => s + i.totalPrice, 0)
  const taxRate = Number(settingsRow?.tax_rate ?? 0)
  const taxAmount = Math.round(subtotal * taxRate) / 100
  const total = subtotal + taxAmount

  // The RPC self-checks p_customer_account_id against get_my_customer_account_id(),
  // which resolves auth.uid() from the caller's session — must run through
  // the session client, not the admin client used for pricing above.
  const supabase = createClient()

  let pickupCode = generatePickupCode()
  let created: { order_id: string; order_number: string; pickup_code: string } | null = null
  let rpcErr: { code?: string; message: string } | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await supabase
      .rpc('create_customer_order_tx', {
        p_customer_account_id: profile.id,
        p_laundry_id: input.laundryId,
        p_order_number: orderNumber,
        p_pickup_code: pickupCode,
        p_subtotal: subtotal,
        p_tax_amount: taxAmount,
        p_total: total,
        p_items: input.items.map(item => ({
          item_type_id: item.itemTypeId ?? null,
          service_id: item.serviceId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          pricing_mode: item.pricingMode,
        })),
        p_note: input.notes?.trim() || null,
      })
      .single()

    if (!result.error) {
      created = result.data as { order_id: string; order_number: string; pickup_code: string }
      rpcErr = null
      break
    }
    rpcErr = result.error
    if (result.error.code !== '23505' || !result.error.message.includes('pickup_code')) break
    pickupCode = generatePickupCode()
  }

  if (!created) return { success: false, error: rpcErr?.message ?? 'Failed to submit order.' }

  return { success: true, data: { orderId: created.order_id, orderNumber: created.order_number } }
}
