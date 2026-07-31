'use server'

import { createAdminClient } from '@/lib/supabase'

export interface DirectoryLaundry {
  id: string
  name: string
  publicSlug: string
}

/**
 * Every laundry a customer can discover without already having a shared
 * link — opted in via settings.allow_customer_submissions and has a
 * public_slug to link into (portal/o/[slug]). Admin client: an anonymous
 * or newly-signed-in visitor has no RLS-visible relationship to laundries
 * they haven't ordered from yet, same reasoning as getLaundryByPublicSlug.ts.
 */
export async function getPublicLaundryDirectory(): Promise<DirectoryLaundry[]> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('laundries')
    .select('id, name, public_slug, settings!inner(allow_customer_submissions)')
    .eq('settings.allow_customer_submissions', true)
    .not('public_slug', 'is', null)
    .is('deleted_at', null)
    .order('name')

  return (data ?? []).map(l => ({ id: l.id, name: l.name, publicSlug: l.public_slug as string }))
}
