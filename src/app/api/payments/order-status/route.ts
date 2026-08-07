import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

/**
 * Status-polling endpoint for order payments — used by both the staff
 * "Pay via Mobile Money" action (OrderDetail/dashboard) and the customer
 * portal invoice's "Pay Now". Reads on the session client, so RLS
 * (tenant_isolation for staff, customer_self_read for customers —
 * 20240045000000) authorizes both callers identically without branching
 * here on which kind of session it is.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference')
  if (!reference) return NextResponse.json({ error: 'reference is required' }, { status: 400 })

  const supabase = createClient()
  const { data } = await supabase
    .from('order_payment_links')
    .select('status')
    .eq('reference_code', reference)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ status: data.status })
}
