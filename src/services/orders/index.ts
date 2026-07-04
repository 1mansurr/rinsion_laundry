'use server'

import { createClient } from '@/lib/supabase'
import { getVerifiedUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { generatePickupCode } from '@/utils/generatePickupCode'
import { WRITE_BLOCKED_STATUSES } from '@/constants/subscriptionStatuses'
import { ORDER_STATUS_TRANSITIONS } from '@/constants/statuses'
import type { OrderStatus, OrderPriority, PricingMode } from '@/constants/statuses'
import type { SubscriptionStatus } from '@/constants/subscriptionStatuses'
import type { ServiceResult } from '@/types/serviceResult'

export interface OrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  priority: OrderPriority
  total: number
  pickupDate: string | null
  createdAt: string
  customerName: string
  customerPhone: string
  branchName: string
}

export interface CreateOrderInput {
  customerId: string
  branchId: string
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

export async function getOrders(laundryId: string, status?: OrderStatus): Promise<OrderListItem[]> {
  const supabase = createClient()

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, status, priority, total, pickup_date, created_at,
      customers(first_name, last_name, phone),
      branches(name)
    `)
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data } = await query

  return (data ?? []).map(r => {
    const customer = r.customers as unknown as { first_name: string; last_name: string; phone: string } | null
    const branch = r.branches as unknown as { name: string } | null
    return {
      id: r.id,
      orderNumber: r.order_number,
      status: r.status as OrderStatus,
      priority: r.priority as OrderPriority,
      total: Number(r.total),
      pickupDate: r.pickup_date,
      createdAt: r.created_at,
      customerName: customer ? `${customer.first_name} ${customer.last_name}` : '',
      customerPhone: customer?.phone ?? '',
      branchName: branch?.name ?? '',
    }
  })
}

export async function createOrder(input: CreateOrderInput): Promise<ServiceResult<{ orderId: string; orderNumber: string; pickupCode: string }>> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id, branch_id, role')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .single()

  if (!emp) return { success: false, error: 'Employee not found.' }

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
  const branchId = emp.role === 'admin' ? input.branchId : emp.branch_id

  // pickup_code is unique per laundry — regenerate and retry on conflict
  let pickupCode = generatePickupCode()
  let order: { id: string } | null = null
  let orderErr: { code?: string; message: string } | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        pickup_code: pickupCode,
        laundry_id: emp.laundry_id,
        branch_id: branchId,
        customer_id: input.customerId,
        created_by_employee_id: emp.id,
        status: 'received',
        priority: input.priority,
        pickup_date: input.pickupDate ?? null,
        subtotal,
        tax_amount: taxAmount,
        total,
      })
      .select('id')
      .single()

    if (!result.error) { order = result.data; orderErr = null; break }
    orderErr = result.error
    if (result.error.code !== '23505' || !result.error.message.includes('pickup_code')) break
    pickupCode = generatePickupCode()
  }

  if (!order) return { success: false, error: orderErr?.message ?? 'Failed to create order.' }

  await supabase.from('order_items').insert(
    input.items.map(item => ({
      order_id: order.id,
      item_type_id: item.itemTypeId ?? null,
      service_id: item.serviceId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      pricing_mode: item.pricingMode,
    }))
  )

  if (input.notes?.trim()) {
    await supabase.from('order_notes').insert({
      order_id: order.id,
      created_by_type: 'employee',
      created_by_id: emp.id,
      note: input.notes.trim(),
    })
  }

  await supabase.from('order_status_history').insert({
    order_id: order.id,
    employee_id: emp.id,
    previous_status: null,
    new_status: 'received',
  })

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    order_id: order.id,
    employee_id: emp.id,
    action_type: 'ORDER_CREATED',
    description: `Order ${orderNumber} created`,
  })

  // Update customer last_visit_date
  await supabase
    .from('customers')
    .update({ last_visit_date: new Date().toISOString().split('T')[0] })
    .eq('id', input.customerId)

  // Send order-created SMS — non-blocking, failure doesn't fail the order
  import('@/services/notifications/sendOrderCreatedSms')
    .then(m => m.sendOrderCreatedSms(order.id))
    .catch(() => null)

  revalidatePath('/orders')
  return { success: true, data: { orderId: order.id, orderNumber, pickupCode } }
}

export async function getOrder(id: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('orders')
    .select(`
      id, order_number, pickup_code, status, priority, pickup_date, subtotal, tax_amount, total, created_at,
      customers(id, first_name, last_name, phone),
      branches(name),
      order_items(
        id, quantity, unit_price, total_price, pricing_mode,
        item_types(name),
        services(name),
        order_item_pieces(id, item_type_id, quantity, item_types(name))
      ),
      payments(id, amount, payment_method, created_at),
      order_refunds(id, amount, refund_method, reason, created_at),
      order_notes(id, note, created_at, created_by_type),
      order_status_history(previous_status, new_status, created_at),
      sms_messages(id, trigger_event, status, phone, created_at)
    `)
    .eq('id', id)
    .single()

  return data
}

export async function searchOrders(laundryId: string, query: string): Promise<OrderListItem[]> {
  if (!query.trim()) return []
  const supabase = createClient()
  const q = query.trim()

  const orderSelect = `
    id, order_number, status, priority, total, pickup_date, created_at,
    customers(first_name, last_name, phone),
    branches(name)
  `

  const toItem = (r: Record<string, unknown>): OrderListItem => {
    const customer = r.customers as { first_name: string; last_name: string; phone: string } | null
    const branch = r.branches as { name: string } | null
    return {
      id: r.id as string,
      orderNumber: r.order_number as string,
      status: r.status as OrderStatus,
      priority: r.priority as OrderPriority,
      total: Number(r.total),
      pickupDate: r.pickup_date as string | null,
      createdAt: r.created_at as string,
      customerName: customer ? `${customer.first_name} ${customer.last_name}` : '',
      customerPhone: customer?.phone ?? '',
      branchName: (branch as { name: string } | null)?.name ?? '',
    }
  }

  // Search by order number and pickup code
  const { data: byOrder } = await supabase
    .from('orders')
    .select(orderSelect)
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .or(`order_number.ilike.*${q}*,pickup_code.ilike.*${q}*`)
    .order('created_at', { ascending: false })
    .limit(20)

  // Search by customer name / phone
  const { data: matchingCustomers } = await supabase
    .from('customers')
    .select('id')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .or(`first_name.ilike.*${q}*,last_name.ilike.*${q}*,phone.ilike.*${q}*`)
    .limit(50)

  const customerIds = (matchingCustomers ?? []).map(c => c.id)
  let byCustomer: typeof byOrder = []
  if (customerIds.length > 0) {
    const { data } = await supabase
      .from('orders')
      .select(orderSelect)
      .eq('laundry_id', laundryId)
      .is('deleted_at', null)
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
      .limit(20)
    byCustomer = data
  }

  // Merge and deduplicate
  const seen = new Set<string>()
  const merged: OrderListItem[] = []
  for (const r of [...(byOrder ?? []), ...(byCustomer ?? [])]) {
    const id = r.id as string
    if (!seen.has(id)) { seen.add(id); merged.push(toItem(r as Record<string, unknown>)) }
  }
  return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('id, laundry_id')
    .eq('auth_user_id', userId)
    .single()

  if (!emp) return { success: false, error: 'Employee not found.' }

  const { data: order } = await supabase
    .from('orders')
    .select('status, total')
    .eq('id', orderId)
    .single()

  if (!order) return { success: false, error: 'Order not found.' }

  const currentStatus = order.status as OrderStatus
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus]
  if (!allowed.includes(newStatus)) {
    return { success: false, error: `Cannot move from ${currentStatus} to ${newStatus}.` }
  }

  if (newStatus === 'collected') {
    const { data: pmts } = await supabase.from('payments').select('amount').eq('order_id', orderId)
    const { data: refs } = await supabase.from('order_refunds').select('amount').eq('order_id', orderId)
    const paid = (pmts ?? []).reduce((s, p) => s + Number(p.amount), 0)
      - (refs ?? []).reduce((s, r) => s + Number(r.amount), 0)
    if (paid < Number(order.total)) {
      const bal = (Number(order.total) - paid).toFixed(2)
      return { success: false, error: `Balance of GHS ${bal} outstanding. Record payment first.` }
    }
  }

  await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    employee_id: emp.id,
    previous_status: currentStatus,
    new_status: newStatus,
  })

  await supabase.from('activity_logs').insert({
    laundry_id: emp.laundry_id,
    order_id: orderId,
    employee_id: emp.id,
    action_type: 'STATUS_UPDATED',
    description: `Status changed from ${currentStatus} to ${newStatus}`,
  })

  // Send order-ready SMS when status moves to Ready — non-blocking
  if (newStatus === 'ready') {
    import('@/services/notifications/sendOrderReadySms')
      .then(m => m.sendOrderReadySms(orderId))
      .catch(() => null)
  }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/orders')
  return { success: true, data: null }
}

function generateOrderNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'ORD-'
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
