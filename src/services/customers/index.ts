'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export interface Customer {
  id: string
  customerCode: string
  firstName: string
  lastName: string
  phone: string
  lastVisitDate: string | null
  createdAt: string
}

export async function getCustomers(laundryId: string): Promise<Customer[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('customers')
    .select('id, customer_code, first_name, last_name, phone, last_visit_date, created_at')
    .eq('laundry_id', laundryId)
    .is('deleted_at', null)
    .order('last_visit_date', { ascending: false, nullsFirst: false })

  return (data ?? []).map(r => ({
    id: r.id,
    customerCode: r.customer_code,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone,
    lastVisitDate: r.last_visit_date,
    createdAt: r.created_at,
  }))
}

export async function createCustomer(input: {
  firstName: string
  lastName: string
  phone: string
}): Promise<ServiceResult<Customer>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: emp } = await supabase
    .from('employees')
    .select('laundry_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!emp) return { success: false, error: 'Employee not found.' }

  // Phone uniqueness check — return existing if found
  const { data: existing } = await supabase
    .from('customers')
    .select('id, customer_code, first_name, last_name, phone, last_visit_date, created_at')
    .eq('laundry_id', emp.laundry_id)
    .eq('phone', input.phone.trim())
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return {
      success: true,
      data: {
        id: existing.id,
        customerCode: existing.customer_code,
        firstName: existing.first_name,
        lastName: existing.last_name,
        phone: existing.phone,
        lastVisitDate: existing.last_visit_date,
        createdAt: existing.created_at,
      },
    }
  }

  const customerCode = `C${Date.now().toString(36).toUpperCase().slice(-6)}`

  const { data, error } = await supabase
    .from('customers')
    .insert({
      laundry_id: emp.laundry_id,
      customer_code: customerCode,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone: input.phone.trim(),
    })
    .select('id, customer_code, first_name, last_name, phone, last_visit_date, created_at')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/customers')
  return {
    success: true,
    data: {
      id: data.id,
      customerCode: data.customer_code,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      lastVisitDate: data.last_visit_date,
      createdAt: data.created_at,
    },
  }
}

export async function getCustomer(id: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('customers')
    .select(`
      id, customer_code, first_name, last_name, phone, first_visit_date, last_visit_date, created_at,
      orders(id, order_number, status, total, created_at, pickup_date)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  return data
}
