import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'

/**
 * Small status-polling endpoint for the subscription "Pay via Mobile Money"
 * button (src/app/(app)/settings/subscription/PaystackPayButton.tsx) — the
 * triggering screen polls this every ~3s for up to ~2 minutes while status
 * stays 'pending'. Reads the same subscription_payment_links row the
 * charge.success webhook updates, so the UI reflects the webhook the moment
 * it lands.
 */
export async function GET(request: NextRequest) {
  const profile = await getMyProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reference = request.nextUrl.searchParams.get('reference')
  if (!reference) return NextResponse.json({ error: 'reference is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('subscription_payment_links')
    .select('status, laundry_id')
    .eq('reference_code', reference)
    .maybeSingle()

  if (!data || data.laundry_id !== profile.laundryId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ status: data.status })
}
