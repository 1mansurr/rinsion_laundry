'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getSoleBranchId } from '@/services/branches/getSoleBranchId'
import { requireActiveSubscription } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { generatePickupCode } from '@/utils/generatePickupCode'
import { validatePriceRanges } from '@/services/pricing/validatePriceRanges'
import { encryptField } from '@/lib/crypto'
import type { OrderPriority, PricingMode } from '@/constants/statuses'
import type { ServiceResult } from '@/types/serviceResult'

export interface CreateOrderInput {
  customerId: string
  priority: OrderPriority
  pickupDate?: string
  notes?: string
  /** Per-order snapshot of the customer's location — editable without touching the customer's saved default. */
  location?: string
  items: {
    /** Absent for per_kg lines — weight-based services aren't priced per item type */
    itemTypeId?: string
    serviceId: string
    /** Piece count when pricingMode is 'per_item', weight in kg when 'per_kg' */
    quantity: number
    unitPrice: number
    totalPrice: number
    pricingMode: PricingMode
  }[]
}

export async function createOrder(input: CreateOrderInput): Promise<ServiceResult<{ orderId: string; orderNumber: string; pickupCode: string }>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }
  const emp = { id: profile.id, laundry_id: profile.laundryId }

  const subCheck = await requireActiveSubscription(emp.laundry_id)
  if (!subCheck.success) return subCheck

  // Validate every submitted price against the live pricing tables before
  // trusting it into subtotal/total. createOrder previously trusted the
  // client completely with no check at all — this closes that gap for both
  // range and fixed-price rows (a fixed row collapses to an exact-match
  // check since min === max, which the current UI can never violate anyway).
  const priceError = await validatePriceRanges(supabase, emp.laundry_id, input.items)
  if (priceError) return { success: false, error: priceError.error }

  const { data: settingsRow } = await supabase
    .from('settings')
    .select('tax_rate')
    .eq('laundry_id', emp.laundry_id)
    .single()

  const orderNumber = generateOrderNumber()
  const subtotal = input.items.reduce((s, i) => s + i.totalPrice, 0)
  const taxRate = Number(settingsRow?.tax_rate ?? 0)
  const taxAmount = Math.round(subtotal * taxRate) / 100
  const total = subtotal + taxAmount
  const branchId = await getSoleBranchId(emp.laundry_id)
  if (!branchId) return { success: false, error: 'No branch found for this laundry.' }

  // pickup_code is unique per laundry — regenerate and retry on conflict.
  // The whole write (orders + order_items + order_notes + order_status_history
  // + activity_logs + customers.last_visit_date) runs atomically in create_order_tx —
  // see supabase/migrations/20240007000000_order_write_transactions.sql.
  let pickupCode = generatePickupCode()
  let created: { order_id: string; order_number: string; pickup_code: string } | null = null
  let rpcErr: { code?: string; message: string } | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await supabase
      .rpc('create_order_tx', {
        p_order_number: orderNumber,
        p_pickup_code: pickupCode,
        p_laundry_id: emp.laundry_id,
        p_branch_id: branchId,
        p_customer_id: input.customerId,
        p_employee_id: emp.id,
        p_priority: input.priority,
        p_pickup_date: input.pickupDate ?? null,
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
        p_location: input.location?.trim() ? encryptField(input.location.trim()) : null,
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

  if (!created) return { success: false, error: rpcErr?.message ?? 'Failed to create order.' }
  const order = created

  // Send order-created SMS — non-blocking, fires after the transaction has committed
  import('@/services/notifications/sendOrderCreatedSms')
    .then(m => m.sendOrderCreatedSms(order.order_id))
    .catch(() => null)

  revalidatePath('/orders')
  return {
    success: true,
    data: { orderId: order.order_id, orderNumber: order.order_number, pickupCode: order.pickup_code },
  }
}

// Exported so submitCustomerOrder.ts can reuse it rather than duplicating.
export function generateOrderNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'ORD-'
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
