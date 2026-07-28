'use server'

import { createClient } from '@/lib/supabase'
import { getMyCustomerProfile } from './getMyCustomerProfile'

export interface LinkedLaundry {
  id: string
  name: string
  publicSlug: string | null
}

/**
 * Laundries this customer has already submitted at least one order to (they
 * have a linked customers row there). Reads through the regular session
 * client — RLS's laundries "customer_self_read" policy only covers laundries
 * reachable this way. Discovering a NEW laundry happens via its public_slug
 * link instead (portal/o/[slug]), not from this list.
 */
export async function getMyLinkedLaundries(): Promise<LinkedLaundry[]> {
  const profile = await getMyCustomerProfile()
  if (!profile) return []

  const supabase = createClient()
  const { data } = await supabase
    .from('customers')
    .select('laundries(id, name, public_slug)')
    .eq('customer_account_id', profile.id)
    .is('deleted_at', null)

  type Row = { laundries: { id: string; name: string; public_slug: string | null } | null }

  return ((data ?? []) as unknown as Row[])
    .map(row => row.laundries)
    .filter((l): l is { id: string; name: string; public_slug: string | null } => !!l)
    .map(l => ({ id: l.id, name: l.name, publicSlug: l.public_slug }))
}
