'use server'

import { createClient, createAdminClient } from '@/lib/supabase'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getMyCustomerProfile } from '@/services/customerAuth/getMyCustomerProfile'
import { requireActiveSubscription } from '@/lib/auth'
import { paystackProvider } from '@/lib/payments'
import type { MobileMoneyProvider } from '@/lib/payments'
import type { ServiceResult } from '@/types/serviceResult'

interface CreateOrderPaymentLinkInput {
  orderId: string
  channel: 'mobile_money' | 'card' | 'bank_transfer'
  /** Required for channel: 'mobile_money' */
  phone?: string
  provider?: MobileMoneyProvider
}

interface OrderPaymentLinkResult {
  referenceCode: string
  displayText?: string
  authorizationUrl?: string
}

/**
 * Callable from either a staff session (OrderDetail/dashboard "Pay via
 * Mobile Money") or a customer session (portal invoice "Pay Now" —
 * created_by_employee_id stays NULL). The initial order read runs on the
 * session client, so RLS (tenant_isolation for staff, customer_self_read for
 * customers — 20240037000000) authorizes both callers identically; anyone
 * else gets a null order (order not found), not a leaked balance.
 */
export async function createPaymentLink(
  input: CreateOrderPaymentLinkInput
): Promise<ServiceResult<OrderPaymentLinkResult>> {
  if (input.channel === 'mobile_money' && (!input.phone || !input.provider)) {
    return { success: false, error: 'Phone and network are required for mobile money.' }
  }

  const [employeeProfile, customerProfile] = await Promise.all([
    getMyProfile(),
    getMyCustomerProfile(),
  ])
  if (!employeeProfile && !customerProfile) return { success: false, error: 'Not authenticated.' }

  const supabase = createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, laundry_id, total, payments(amount)')
    .eq('id', input.orderId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!order) return { success: false, error: 'Order not found.' }

  const subCheck = await requireActiveSubscription(order.laundry_id)
  if (!subCheck.success) return subCheck

  const paid = ((order.payments as { amount: number }[]) ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const balance = Number(order.total) - paid
  if (balance <= 0) return { success: false, error: 'This order is already fully paid.' }

  const admin = createAdminClient()
  const { data: payoutAccount } = await admin
    .from('laundry_payout_accounts')
    .select('paystack_subaccount_code, status')
    .eq('laundry_id', order.laundry_id)
    .maybeSingle()

  if (!payoutAccount || payoutAccount.status !== 'active') {
    return { success: false, error: 'This laundry has not set up online payments yet — ask staff to set up payouts first.' }
  }

  const reference = `RNSN-ORD-${input.orderId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
  const metadata = {
    purpose: 'order_payment',
    orderId: input.orderId,
    laundryId: order.laundry_id,
    subaccountCode: payoutAccount.paystack_subaccount_code,
  }

  let authorizationUrl: string | undefined
  let displayText: string | undefined

  try {
    if (input.channel === 'mobile_money') {
      const result = await paystackProvider.chargeMobileMoney(balance, reference, input.phone!, input.provider!, metadata)
      displayText = result.displayText
    } else {
      const link = await paystackProvider.createPaymentLink(balance, reference, {
        ...metadata,
        callbackPath: `/orders/${input.orderId}`,
      })
      authorizationUrl = link.url
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to start payment.' }
  }

  const { error: insertErr } = await admin.from('order_payment_links').insert({
    order_id: input.orderId,
    laundry_id: order.laundry_id,
    reference_code: reference,
    amount: balance,
    channel: input.channel,
    authorization_url: authorizationUrl ?? null,
    display_text: displayText ?? null,
    created_by_employee_id: employeeProfile?.id ?? null,
  })
  if (insertErr) return { success: false, error: insertErr.message }

  return { success: true, data: { referenceCode: reference, displayText, authorizationUrl } }
}
