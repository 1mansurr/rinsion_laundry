'use server'

import { createClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'
import type { Customer } from './getCustomers'

export async function createCustomer(input: {
  firstName: string
  lastName: string
  phone: string
}): Promise<ServiceResult<Customer>> {
  const supabase = createClient()
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }
  const emp = { laundry_id: profile.laundryId }

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
