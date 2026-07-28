'use server'

import { createAdminClient } from '@/lib/supabase'

export interface PublicLaundry {
  id: string
  name: string
  allowCustomerSubmissions: boolean
}

/**
 * Resolves a laundry by its public_slug for the customer portal entry point
 * (portal/o/[slug]). Runs via the admin client, bypassing RLS — same
 * established precedent as the existing join-by-PIN laundry lookup
 * (joinLaundry.ts): a customer visiting for the first time has no
 * customers/customer_accounts relationship yet for RLS to key off, so this
 * deliberately isn't a session-client query. Returns null if the slug
 * doesn't resolve to a live, non-deleted laundry — the caller doesn't
 * distinguish "no such slug" from "not accepting submissions" in the
 * response (both just mean "not available"), but allowCustomerSubmissions is
 * still exposed for that caller-side branch.
 */
export async function getLaundryByPublicSlug(slug: string): Promise<PublicLaundry | null> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('laundries')
    .select('id, name, deleted_at, settings(allow_customer_submissions)')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!data || data.deleted_at) return null

  const settings = data.settings as unknown as { allow_customer_submissions: boolean } | null

  return {
    id: data.id,
    name: data.name,
    allowCustomerSubmissions: settings?.allow_customer_submissions ?? false,
  }
}
