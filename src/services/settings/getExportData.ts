'use server'

import { createClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'

export interface ExportData {
  customers: {
    customerCode: string
    firstName: string
    lastName: string
    phone: string
    firstVisitDate: string | null
    lastVisitDate: string | null
    createdAt: string
  }[]
  employees: {
    firstName: string
    lastName: string
    email: string | null
    phone: string
    role: string
    isActive: boolean
    branchName: string
    createdAt: string
  }[]
  branches: {
    branchCode: string
    name: string
    createdAt: string
  }[]
  orders: {
    orderNumber: string
    pickupCode: string
    branchName: string
    customerName: string
    customerPhone: string
    status: string
    priority: string
    pickupDate: string | null
    subtotal: number
    total: number
    createdAt: string
  }[]
  orderItems: {
    orderNumber: string
    itemTypeName: string
    serviceName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
  payments: {
    orderNumber: string
    amount: number
    paymentMethod: string
    recordedBy: string
    createdAt: string
  }[]
  itemTypes: { name: string; isActive: boolean }[]
  services: {
    name: string
    isActive: boolean
    pricingMode: string
    minKgRate: number | null
    maxKgRate: number | null
    notes: string | null
  }[]
}

/**
 * Pulls every active (non-deleted) business record for a laundry, decrypted,
 * for the self-serve data export. Unlike the paginated *List services used by
 * the UI, this fetches full tables — acceptable at the scale a single
 * laundry's data runs at (see getCustomersList.ts's own note on the same
 * trade-off for search).
 */
export async function getExportData(laundryId: string): Promise<ExportData> {
  const supabase = createClient()

  const [
    { data: customers },
    { data: employees },
    { data: branches },
    { data: orders },
    { data: orderItems },
    { data: payments },
    { data: itemTypes },
    { data: services },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('customer_code, first_name, last_name, phone, first_visit_date, last_visit_date, created_at')
      .eq('laundry_id', laundryId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('employees')
      .select('first_name, last_name, email, phone, role, is_active, created_at, branches(name)')
      .eq('laundry_id', laundryId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('branches')
      .select('branch_code, name, created_at')
      .eq('laundry_id', laundryId)
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('order_number, pickup_code, status, priority, pickup_date, subtotal, total, created_at, branches(name), customers(first_name, last_name, phone)')
      .eq('laundry_id', laundryId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('order_items')
      .select('quantity, unit_price, total_price, orders!inner(order_number, laundry_id), item_types(name), services(name)')
      .eq('orders.laundry_id', laundryId),
    supabase
      .from('payments')
      .select('amount, payment_method, created_at, orders!inner(order_number, laundry_id), employees(first_name, last_name)')
      .eq('orders.laundry_id', laundryId)
      .order('created_at', { ascending: true }),
    supabase
      .from('item_types')
      .select('name, is_active')
      .eq('laundry_id', laundryId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('services')
      .select('name, is_active, pricing_mode, min_kg_rate, max_kg_rate, notes')
      .eq('laundry_id', laundryId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
  ])

  return {
    customers: (customers ?? []).map(c => ({
      customerCode: c.customer_code,
      firstName: decryptField(c.first_name) ?? '',
      lastName: decryptField(c.last_name) ?? '',
      phone: decryptField(c.phone) ?? '',
      firstVisitDate: c.first_visit_date,
      lastVisitDate: c.last_visit_date,
      createdAt: c.created_at,
    })),
    employees: (employees ?? []).map(e => {
      const branch = e.branches as unknown as { name: string } | null
      return {
        firstName: e.first_name,
        lastName: e.last_name,
        email: decryptField(e.email),
        phone: decryptField(e.phone) ?? '',
        role: e.role,
        isActive: e.is_active,
        branchName: branch?.name ?? '',
        createdAt: e.created_at,
      }
    }),
    branches: (branches ?? []).map(b => ({
      branchCode: b.branch_code,
      name: b.name,
      createdAt: b.created_at,
    })),
    orders: (orders ?? []).map(o => {
      const branch = o.branches as unknown as { name: string } | null
      const cust = o.customers as unknown as { first_name: string; last_name: string; phone: string } | null
      return {
        orderNumber: o.order_number,
        pickupCode: o.pickup_code,
        branchName: branch?.name ?? '',
        customerName: cust ? `${decryptField(cust.first_name) ?? ''} ${decryptField(cust.last_name) ?? ''}`.trim() : '',
        customerPhone: cust ? decryptField(cust.phone) ?? '' : '',
        status: o.status,
        priority: o.priority,
        pickupDate: o.pickup_date,
        subtotal: Number(o.subtotal),
        total: Number(o.total),
        createdAt: o.created_at,
      }
    }),
    orderItems: (orderItems ?? []).map(i => {
      const order = i.orders as unknown as { order_number: string } | null
      const itemType = i.item_types as unknown as { name: string } | null
      const service = i.services as unknown as { name: string } | null
      return {
        orderNumber: order?.order_number ?? '',
        itemTypeName: itemType?.name ?? '',
        serviceName: service?.name ?? '',
        quantity: Number(i.quantity),
        unitPrice: Number(i.unit_price),
        totalPrice: Number(i.total_price),
      }
    }),
    payments: (payments ?? []).map(p => {
      const order = p.orders as unknown as { order_number: string } | null
      const emp = p.employees as unknown as { first_name: string; last_name: string } | null
      return {
        orderNumber: order?.order_number ?? '',
        amount: Number(p.amount),
        paymentMethod: p.payment_method,
        recordedBy: emp ? `${emp.first_name} ${emp.last_name}`.trim() : '',
        createdAt: p.created_at,
      }
    }),
    itemTypes: (itemTypes ?? []).map(t => ({ name: t.name, isActive: t.is_active })),
    services: (services ?? []).map(s => ({
      name: s.name,
      isActive: s.is_active,
      pricingMode: s.pricing_mode,
      minKgRate: s.min_kg_rate === null ? null : Number(s.min_kg_rate),
      maxKgRate: s.max_kg_rate === null ? null : Number(s.max_kg_rate),
      notes: s.notes,
    })),
  }
}
