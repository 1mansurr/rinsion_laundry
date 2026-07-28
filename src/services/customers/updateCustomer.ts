'use server'

import { createClient } from '@/lib/supabase'
import { encryptField, computeBlindIndex } from '@/lib/crypto'
import { normalizeCustomerPhone } from '@/utils/normalizeCustomerPhone'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceResult } from '@/types/serviceResult'

export async function updateCustomer(input: {
  id: string
  firstName: string
  lastName: string
  phone: string
  location: string
}): Promise<ServiceResult<null>> {
  const profile = await getMyProfile()
  if (!profile) return { success: false, error: 'Not authenticated.' }

  const subCheck = await requireActiveSubscription(profile.laundryId)
  if (!subCheck.success) return subCheck

  const supabase = createClient()
  const normalizedPhone = normalizeCustomerPhone(input.phone)
  const phoneBidx = computeBlindIndex(normalizedPhone)
  const location = input.location.trim()

  const { error } = await supabase
    .from('customers')
    .update({
      first_name: encryptField(input.firstName.trim()),
      last_name: encryptField(input.lastName.trim()),
      phone: encryptField(normalizedPhone),
      phone_bidx: phoneBidx,
      location: location ? encryptField(location) : null,
    })
    .eq('id', input.id)
    .eq('laundry_id', profile.laundryId)

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Another customer already has this phone number.' }
    return { success: false, error: error.message }
  }

  revalidatePath('/customers')
  revalidatePath(`/customers/${input.id}`)
  return { success: true, data: null }
}
