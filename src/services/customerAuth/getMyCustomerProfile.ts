import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase'
import { decryptField } from '@/lib/crypto'
import { getVerifiedUserId } from '@/lib/auth'

export interface MyCustomerProfile {
  id: string
  authUserId: string
  firstName: string | null
  lastName: string | null
  phone: string
}

interface CustomerAccountRow {
  id: string
  auth_user_id: string
  first_name: string | null
  last_name: string | null
  phone: string
}

// Mirrors services/employees/getMyProfile.ts structurally. Cached for 5 min —
// uses the admin client because unstable_cache runs outside request context
// (no cookies); auth is verified first via getVerifiedUserId.
const fetchCustomerAccountRow = unstable_cache(
  async (userId: string): Promise<CustomerAccountRow | null> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('customer_accounts')
      .select('id, auth_user_id, first_name, last_name, phone')
      .eq('auth_user_id', userId)
      .is('deleted_at', null)
      .maybeSingle()
    return data as CustomerAccountRow | null
  },
  ['customer-account-profile'],
  { revalidate: 300, tags: ['customer-account-profile'] },
)

function buildProfile(data: CustomerAccountRow): MyCustomerProfile {
  return {
    id: data.id,
    authUserId: data.auth_user_id,
    firstName: decryptField(data.first_name),
    lastName: decryptField(data.last_name),
    phone: decryptField(data.phone) ?? '',
  }
}

// cache() deduplicates calls within a single request — layout and page both
// may call this, but only the first resolves.
export const getMyCustomerProfile = cache(async function (): Promise<MyCustomerProfile | null> {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return null
  const data = await fetchCustomerAccountRow(userId)
  return data ? buildProfile(data) : null
})
