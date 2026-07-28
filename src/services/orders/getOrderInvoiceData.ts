'use server'

import { createClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import type { OrderStatus, PricingMode } from '@/constants/statuses'

export interface OrderInvoiceData {
  orderId: string
  orderNumber: string
  status: OrderStatus
  createdAt: string
  laundryName: string
  customerName: string
  customerPhone: string
  /** Pre-filled default for the Request Pickup screen — see requestPickup.ts */
  location: string | null
  items: {
    id: string
    quantity: number
    unitPrice: number
    totalPrice: number
    pricingMode: PricingMode
    itemTypeName: string
    serviceName: string
  }[]
  subtotal: number
  taxAmount: number
  total: number
  amountPaid: number
  balanceDue: number
}

/**
 * Assembles the data for the customer-facing invoice
 * ((portal)/portal/orders/[orderId]/invoice). Runs on the session client —
 * RLS's customer_self_read policies (added alongside customer_accounts,
 * 20240037000000) scope this to the calling customer's own orders
 * automatically, the same way every other customer-portal read works.
 */
export async function getOrderInvoiceData(orderId: string): Promise<OrderInvoiceData | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, created_at, subtotal, tax_amount, total, location,
      laundries(name),
      customers(first_name, last_name, phone),
      order_items(id, quantity, unit_price, total_price, pricing_mode, item_types(name), services(name)),
      payments(amount)
    `)
    .eq('id', orderId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!data) return null

  const laundry = data.laundries as unknown as { name: string } | null
  const customer = data.customers as unknown as { first_name: string; last_name: string; phone: string } | null

  const items = ((data.order_items as unknown as {
    id: string; quantity: number; unit_price: number; total_price: number; pricing_mode: PricingMode
    item_types: { name: string } | null; services: { name: string } | null
  }[]) ?? []).map(item => ({
    id: item.id,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    totalPrice: Number(item.total_price),
    pricingMode: item.pricing_mode,
    itemTypeName: item.item_types?.name ?? '—',
    serviceName: item.services?.name ?? '—',
  }))

  const payments = (data.payments as unknown as { amount: number }[]) ?? []
  const amountPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const total = Number(data.total)

  return {
    orderId: data.id,
    orderNumber: data.order_number,
    status: data.status as OrderStatus,
    createdAt: data.created_at,
    laundryName: laundry?.name ?? '',
    customerName: customer ? `${decryptField(customer.first_name) ?? ''} ${decryptField(customer.last_name) ?? ''}`.trim() : '',
    customerPhone: customer ? decryptField(customer.phone) ?? '' : '',
    location: decryptField(data.location),
    items,
    subtotal: Number(data.subtotal),
    taxAmount: Number(data.tax_amount),
    total,
    amountPaid,
    balanceDue: Math.max(0, total - amountPaid),
  }
}
