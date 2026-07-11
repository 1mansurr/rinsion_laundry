'use server'

import { createClient, type DbClient } from '@/lib/supabase'

/**
 * Branch selection is removed from the UI, but branches.id / *.branch_id FKs
 * stay NOT NULL (see docs/auth_spec.md §2) — this resolves the laundry's
 * one branch server-side so callers never need a UI-supplied branchId.
 *
 * Accepts an optional client because most callers run under an authenticated
 * employee session (the default RLS-scoped createClient() is correct), but
 * acceptInvite runs with no session at all and must pass its admin client.
 */
export async function getSoleBranchId(laundryId: string, client?: DbClient): Promise<string | null> {
  const supabase = client ?? createClient()
  const { data } = await supabase
    .from('branches')
    .select('id')
    .eq('laundry_id', laundryId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}
