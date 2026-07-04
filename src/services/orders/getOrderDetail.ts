'use server'

import { createClient } from '@/lib/supabase'
import { getOrder } from '@/services/orders'
import { getItemTypes } from '@/services/items'
import type { OrderStatus, OrderPriority, PricingMode } from '@/constants/statuses'

export interface OrderDetailData {
  orderId: string
  orderNumber: string
  status: OrderStatus
  priority: OrderPriority
  pickupCode: string
  pickupDate: string | null
  subtotal: number
  taxAmount: number
  total: number
  amountPaid: number
  customerName: string
  customerId: string
  customerPhone: string
  branchName: string
  createdAt: string
  cancelledAt: string | null
  previousStatusOnCancel: string | null
  items: {
    id: string
    quantity: number
    unitPrice: number
    totalPrice: number
    pricingMode: PricingMode
    itemTypeName: string
    serviceName: string
    pieces: { id: string; itemTypeId: string; itemTypeName: string; quantity: number }[]
  }[]
  itemTypes: { id: string; name: string }[]
  payments: { id: string; amount: number; paymentMethod: string; createdAt: string }[]
  refunds: { id: string; amount: number; refundMethod: string; reason: string | null; createdAt: string }[]
  notes: { id: string; note: string; createdAt: string; authorName: string }[]
  activities: { id: string; description: string; createdAt: string; employeeName: string }[]
}

export async function getOrderDetail(id: string, laundryId: string): Promise<OrderDetailData | null> {
  const order = await getOrder(id)
  if (!order) return null

  const supabase = createClient()

  // Enrich notes with employee author names
  const { data: rawNotes } = await supabase
    .from('order_notes')
    .select('id, note, created_at, created_by_type, created_by_id')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true })

  const empIds = (rawNotes ?? [])
    .filter(n => n.created_by_type === 'employee' && n.created_by_id)
    .map(n => n.created_by_id as string)

  let authorNames: Record<string, string> = {}
  if (empIds.length > 0) {
    const { data: emps } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .in('id', empIds)
    authorNames = Object.fromEntries(
      (emps ?? []).map(e => [e.id, `${e.first_name} ${e.last_name}`])
    )
  }

  const notes = (rawNotes ?? []).map(n => ({
    id: n.id,
    note: n.note,
    createdAt: n.created_at,
    authorName: n.created_by_id ? (authorNames[n.created_by_id] ?? '') : '',
  }))

  // Activity log for this order
  const { data: activityRows } = await supabase
    .from('activity_logs')
    .select('id, description, created_at, employees(first_name, last_name)')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })

  const activities = (activityRows ?? []).map(a => {
    const emp = a.employees as unknown as { first_name: string; last_name: string } | null
    return {
      id: a.id as string,
      description: a.description as string,
      createdAt: a.created_at as string,
      employeeName: emp ? `${emp.first_name} ${emp.last_name}` : '',
    }
  })

  // Shape data from getOrder response
  const customer = order.customers as unknown as { id: string; first_name: string; last_name: string; phone: string } | null
  const branch = order.branches as unknown as { name: string } | null

  const items = ((order.order_items as unknown as {
    id: string; quantity: number; unit_price: number; total_price: number; pricing_mode: 'per_item' | 'per_kg';
    item_types: { name: string } | null; services: { name: string } | null
    order_item_pieces: { id: string; item_type_id: string; quantity: number; item_types: { name: string } | null }[] | null
  }[]) ?? []).map(item => ({
    id: item.id,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    totalPrice: Number(item.total_price),
    pricingMode: item.pricing_mode,
    itemTypeName: item.item_types?.name ?? '—',
    serviceName: item.services?.name ?? '—',
    pieces: (item.order_item_pieces ?? []).map(p => ({
      id: p.id,
      itemTypeId: p.item_type_id,
      itemTypeName: p.item_types?.name ?? '—',
      quantity: p.quantity,
    })),
  }))

  const itemTypes = (await getItemTypes(laundryId))
    .filter(t => t.isActive)
    .map(t => ({ id: t.id, name: t.name }))

  const payments = ((order.payments as {
    id: string; amount: number; payment_method: string; created_at: string
  }[]) ?? []).map(p => ({
    id: p.id,
    amount: Number(p.amount),
    paymentMethod: p.payment_method,
    createdAt: p.created_at,
  }))

  const refunds = ((order.order_refunds as {
    id: string; amount: number; refund_method: string; reason: string | null; created_at: string
  }[]) ?? []).map(r => ({
    id: r.id,
    amount: Number(r.amount),
    refundMethod: r.refund_method,
    reason: r.reason,
    createdAt: r.created_at,
  }))

  const grossPaid = payments.reduce((s, p) => s + p.amount, 0)
  const totalRefunded = refunds.reduce((s, r) => s + r.amount, 0)
  const amountPaid = grossPaid - totalRefunded

  // Cancelled metadata
  const statusHistory = (order.order_status_history as {
    previous_status: string | null; new_status: string; created_at: string
  }[]) ?? []

  const cancelEntry = statusHistory.find(h => h.new_status === 'cancelled')
  const cancelledAt = cancelEntry?.created_at ?? null
  const previousStatusOnCancel = cancelEntry?.previous_status ?? null

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    status: order.status as OrderStatus,
    priority: (order.priority ?? 'normal') as OrderPriority,
    pickupCode: order.pickup_code,
    pickupDate: order.pickup_date ?? null,
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.tax_amount),
    total: Number(order.total),
    amountPaid,
    customerName: customer ? `${customer.first_name} ${customer.last_name}` : '—',
    customerId: customer?.id ?? '',
    customerPhone: customer?.phone ?? '',
    branchName: branch?.name ?? '',
    createdAt: order.created_at,
    cancelledAt,
    previousStatusOnCancel,
    items,
    itemTypes,
    payments,
    refunds,
    notes,
    activities,
  }
}
