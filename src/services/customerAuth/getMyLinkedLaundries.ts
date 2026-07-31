'use server'

import { createClient } from '@/lib/supabase'
import { getMyCustomerProfile } from './getMyCustomerProfile'

export interface LinkedLaundry {
  id: string
  name: string
  publicSlug: string | null
  /** Empty string if somehow no order exists yet — sorts last. */
  lastOrderAt: string
}

/**
 * Laundries this customer has already submitted at least one order to (they
 * have a linked customers row there), sorted most-recently-ordered first so
 * the portal home page can recommend a default. Reads through the regular
 * session client — RLS's laundries "customer_self_read" policy only covers
 * laundries reachable this way. Discovering a NEW laundry happens via its
 * public_slug link or the open directory (getPublicLaundryDirectory.ts),
 * not from this list.
 */
export async function getMyLinkedLaundries(): Promise<LinkedLaundry[]> {
  const profile = await getMyCustomerProfile()
  if (!profile) return []

  const supabase = createClient()

  const [{ data: customerRows }, { data: orderRows }] = await Promise.all([
    supabase
      .from('customers')
      .select('laundry_id, laundries(id, name, public_slug)')
      .eq('customer_account_id', profile.id)
      .is('deleted_at', null),
    supabase
      .from('orders')
      .select('laundry_id, created_at')
      .eq('created_by_customer_account_id', profile.id)
      .order('created_at', { ascending: false }),
  ])

  const lastOrderByLaundry = new Map<string, string>()
  for (const o of orderRows ?? []) {
    if (!lastOrderByLaundry.has(o.laundry_id)) lastOrderByLaundry.set(o.laundry_id, o.created_at)
  }

  type Row = { laundry_id: string; laundries: { id: string; name: string; public_slug: string | null } | null }

  const laundries = ((customerRows ?? []) as unknown as Row[])
    .filter((row): row is Row & { laundries: NonNullable<Row['laundries']> } => !!row.laundries)
    .map(row => ({
      id: row.laundries.id,
      name: row.laundries.name,
      publicSlug: row.laundries.public_slug,
      lastOrderAt: lastOrderByLaundry.get(row.laundry_id) ?? '',
    }))

  return laundries.sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt))
}
