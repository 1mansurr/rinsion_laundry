'use server'

import { createClient } from '@/lib/supabase'

/** Counts cap-eligible SMS messages sent in the given subscription cycle. */
export async function computeSmsUsage(laundryId: string, cycleStart: string, cycleEnd: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('sms_messages')
    .select('id', { count: 'exact', head: true })
    .eq('laundry_id', laundryId)
    .eq('counts_toward_cap', true)
    .gte('created_at', `${cycleStart}T00:00:00`)
    .lte('created_at', `${cycleEnd}T23:59:59`)

  return count ?? 0
}
