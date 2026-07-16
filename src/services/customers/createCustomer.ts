'use server'

import { createClient } from '@/lib/supabase'
import { decryptField, encryptField, computeBlindIndex } from '@/lib/crypto'
import { normalizeCustomerPhone } from '@/utils/normalizeCustomerPhone'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireActiveSubscription } from '@/lib/auth'
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

  const subCheck = await requireActiveSubscription(emp.laundry_id)
  if (!subCheck.success) return subCheck

  const normalizedPhone = normalizeCustomerPhone(input.phone)
  const phoneBidx = computeBlindIndex(normalizedPhone)

  // Phone uniqueness check — return existing if found
  const { data: existing } = await supabase
    .from('customers')
    .select('id, customer_code, first_name, last_name, phone, last_visit_date, created_at')
    .eq('laundry_id', emp.laundry_id)
    .eq('phone_bidx', phoneBidx)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return {
      success: true,
      data: {
        id: existing.id,
        customerCode: existing.customer_code,
        firstName: decryptField(existing.first_name) ?? '',
        lastName: decryptField(existing.last_name) ?? '',
        phone: decryptField(existing.phone) ?? '',
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
      first_name: encryptField(input.firstName.trim()),
      last_name: encryptField(input.lastName.trim()),
      phone: encryptField(normalizedPhone),
      phone_bidx: phoneBidx,
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
      firstName: decryptField(data.first_name) ?? '',
      lastName: decryptField(data.last_name) ?? '',
      phone: decryptField(data.phone) ?? '',
      lastVisitDate: data.last_visit_date,
      createdAt: data.created_at,
    },
  }
}
