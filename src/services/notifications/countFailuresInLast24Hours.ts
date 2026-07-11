'use server'

import { createClient } from '@/lib/supabase'
import { SMS_STATUS } from '@/constants/statuses'

/** Counts failed customer-facing SMS sends for this laundry in the rolling prior 24 hours.
 *  Used to determine whether a new failure should count toward the SMS quota cap.
 *  Spec: failures count toward cap only when ≥5 failures exist in the prior 24h window. */
export async function countFailuresInLast24Hours(laundryId: string): Promise<number> {
  const supabase = createClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('sms_messages')
    .select('id', { count: 'exact', head: true })
    .eq('laundry_id', laundryId)
    .eq('status', SMS_STATUS.FAILED)
    .gte('created_at', since)

  return count ?? 0
}
