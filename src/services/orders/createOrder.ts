'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getSoleBranchId } from '@/services/branches/getSoleBranchId'
import { revalidatePath } from 'next/cache'
import { generatePickupCode } from '@/utils/generatePickupCode'
import { WRITE_BLOCKED_STATUSES } from '@/constants/subscriptionStatuses'
import type { OrderPriority, PricingMode } from '@/constants/statuses'
import type { SubscriptionStatus } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

export interface CreateOrderInput {
  customerId: string
  priority: OrderPriority
  pickupDate?: string
  notes?: string
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

  // Subscription write-block check
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('laundry_id', emp.laundry_id)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (!sub) return { success: false, error: 'No active subscription. Contact Rinsion support.' }
  if (WRITE_BLOCKED_STATUSES.includes(sub.status as SubscriptionStatus)) {
    return { success: false, error: 'Account is blocked. Please renew your subscription.' }
  }

  // Validate every submitted price against the live pricing tables before
  // trusting it into subtotal/total. createOrder previously trusted the
  // client completely with no check at all — this closes that gap for both
  // range and fixed-price rows (a fixed row collapses to an exact-match
  // check since min === max, which the current UI can never violate anyway).
  const perItemItems = input.items.filter(i => i.pricingMode !== 'per_kg')
  const perKgServiceIds = Array.from(new Set(input.items.filter(i => i.pricingMode === 'per_kg').map(i => i.serviceId)))
  const itemTypeIds = Array.from(new Set(perItemItems.map(i => i.itemTypeId).filter((id): id is string => !!id)))
  const perItemServiceIds = Array.from(new Set(perItemItems.map(i => i.serviceId)))

  const [{ data: priceRows }, { data: kgRows }] = await Promise.all([
    itemTypeIds.length > 0
      ? supabase
          .from('item_service_prices')
          .select('item_type_id, service_id, min_price, max_price')
          .eq('laundry_id', emp.laundry_id)
          .eq('is_active', true)
          .in('item_type_id', itemTypeIds)
          .in('service_id', perItemServiceIds)
      : Promise.resolve({ data: [] as { item_type_id: string; service_id: string; min_price: number; max_price: number }[] }),
    perKgServiceIds.length > 0
      ? supabase
          .from('services')
          .select('id, min_kg_rate, max_kg_rate')
          .eq('laundry_id', emp.laundry_id)
          .in('id', perKgServiceIds)
      : Promise.resolve({ data: [] as { id: string; min_kg_rate: number | null; max_kg_rate: number | null }[] }),
  ])

  const priceByKey = new Map(
    (priceRows ?? []).map(r => [`${r.item_type_id}:${r.service_id}`, { min: Number(r.min_price), max: Number(r.max_price) }])
  )
  const kgRateById = new Map(
    (kgRows ?? []).map(r => [r.id, { min: r.min_kg_rate !== null ? Number(r.min_kg_rate) : null, max: r.max_kg_rate !== null ? Number(r.max_kg_rate) : null }])
  )

  for (const item of input.items) {
    if (item.pricingMode === 'per_kg') {
      const rate = kgRateById.get(item.serviceId)
      if (!rate || rate.min === null || rate.max === null) {
        return { success: false, error: 'Price not found for the selected service. Refresh and try again.' }
      }
      if (!priceWithinRange(item.unitPrice, rate.min, rate.max)) {
        return { success: false, error: `Price must be between GHS ${rate.min.toFixed(2)} and GHS ${rate.max.toFixed(2)} (submitted GHS ${item.unitPrice.toFixed(2)}).` }
      }
    } else {
      if (!item.itemTypeId) return { success: false, error: 'Missing item type for a per-item line.' }
      const range = priceByKey.get(`${item.itemTypeId}:${item.serviceId}`)
      if (!range) {
        return { success: false, error: 'Price not found for the selected item. Refresh and try again.' }
      }
      if (!priceWithinRange(item.unitPrice, range.min, range.max)) {
        return { success: false, error: `Price must be between GHS ${range.min.toFixed(2)} and GHS ${range.max.toFixed(2)} (submitted GHS ${item.unitPrice.toFixed(2)}).` }
      }
    }
  }

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

// Integer-cents comparison avoids float rounding false-positives against DECIMAL(10,2) columns.
function priceWithinRange(value: number, min: number, max: number): boolean {
  const cents = Math.round(value * 100)
  return cents >= Math.round(min * 100) && cents <= Math.round(max * 100)
}

function generateOrderNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'ORD-'
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
