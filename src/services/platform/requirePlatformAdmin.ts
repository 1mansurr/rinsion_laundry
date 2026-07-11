'use server'

import { createClient, createAdminClient } from '@/lib/supabase'

/**
 * platform_admins has zero RLS policies (see migration 20240010000000), so
 * even the caller's own session client can't read it — membership must be
 * checked with the admin client, after first verifying the caller's identity
 * via the regular session client. Returns the platform_admins.id, or null.
 */
export async function requirePlatformAdmin(): Promise<string | null> {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return data?.id ?? null
}
