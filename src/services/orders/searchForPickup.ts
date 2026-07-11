'use server'

import { getMyProfile } from '@/services/employees/getMyProfile'
import { searchOrders } from '@/services/orders/searchOrders'

export async function searchForPickup(query: string) {
  const profile = await getMyProfile()
  if (!profile) return []
  return searchOrders(profile.laundryId, query)
}
