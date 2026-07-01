'use server'

import { createClient } from '@/lib/supabase'
import { isInternalAdminEmail } from '@/lib/internal-admins'

/**
 * Returns the current user's email if they are in the internal admin allowlist,
 * otherwise returns null. Use in server components and server actions that gate
 * access to /internal/* routes.
 */
export async function isInternalAdmin(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  return isInternalAdminEmail(user.email) ? user.email : null
}
