/**
 * lib/payments/paystack.ts
 *
 * Paystack payment provider.
 *
 * chargeMobileMoney() calls the Charge API — pushes a USSD/PIN prompt to the
 * customer's device (Rinsion's primary flow). createPaymentLink() calls
 * Initialize Transaction — a hosted redirect, kept as the card/bank fallback
 * (no device-push equivalent exists for those channels). Both report
 * completion through the same `charge.success` webhook; verifyWebhook()
 * checks the HMAC-SHA512 signature Paystack sends over the raw request body.
 *
 * Switching the active provider only requires updating lib/payments/index.ts
 * — no service-layer or UI code changes needed.
 *
 * Spec reference: Rinsion_Technical_Overview.md §12 (Payment Provider Abstraction)
 */

import { createHmac } from 'crypto'
import { headers } from 'next/headers'
import { logger } from '@/lib/logger'
import type { PaymentProvider, PaymentLink, PaymentEvent, ChargeResult, MobileMoneyProvider } from './types'
import { charge, initializeTransaction, type ChargeResponseData } from './paystackClient'

/** Paystack amounts are in the lowest currency unit — pesewas for GHS. */
function toPesewas(ghsAmount: number): number {
  return Math.round(ghsAmount * 100)
}

function getBaseUrl(): string {
  const headerList = headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const proto = headerList.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

export class PaystackProvider implements PaymentProvider {
  async createPaymentLink(
    amount: number,
    reference: string,
    metadata: Record<string, unknown>
  ): Promise<PaymentLink> {
    const callbackPath = typeof metadata.callbackPath === 'string' ? metadata.callbackPath : '/'
    const email = typeof metadata.email === 'string' ? metadata.email : 'billing@rinsion.app'
    const subaccount = typeof metadata.subaccountCode === 'string' ? metadata.subaccountCode : undefined

    const res = await initializeTransaction({
      email,
      amount: toPesewas(amount),
      reference,
      callbackUrl: `${getBaseUrl()}${callbackPath}`,
      metadata,
      subaccount,
    })

    if (!res.status) {
      logger.error('PaystackProvider.createPaymentLink: initialize failed', res.message)
      throw new Error(res.message || 'Failed to create payment link')
    }

    return {
      url: res.data.authorization_url,
      referenceCode: reference,
      amount,
    }
  }

  async chargeMobileMoney(
    amount: number,
    reference: string,
    phone: string,
    provider: MobileMoneyProvider,
    metadata: Record<string, unknown>
  ): Promise<ChargeResult> {
    const email = typeof metadata.email === 'string' ? metadata.email : 'billing@rinsion.app'
    const subaccount = typeof metadata.subaccountCode === 'string' ? metadata.subaccountCode : undefined

    const res = await charge({
      email,
      amount: toPesewas(amount),
      reference,
      phone,
      provider,
      metadata,
      subaccount,
    })

    if (!res.status) {
      logger.error('PaystackProvider.chargeMobileMoney: charge failed', res.message)
      throw new Error(res.message || 'Failed to initiate mobile money charge')
    }

    const data = res.data as ChargeResponseData
    return {
      status: data.status,
      referenceCode: data.reference,
      displayText: data.display_text,
      amount,
    }
  }

  async verifyWebhook(
    rawBody: string,
    signature: string
  ): Promise<PaymentEvent | null> {
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
      logger.error('PaystackProvider.verifyWebhook: PAYSTACK_SECRET_KEY is not set')
      return null
    }

    const expected = createHmac('sha512', secret).update(rawBody).digest('hex')
    if (expected !== signature) {
      logger.error('PaystackProvider.verifyWebhook: signature mismatch')
      return null
    }

    let parsed: { event: string; data: Record<string, unknown> }
    try {
      parsed = JSON.parse(rawBody)
    } catch (err) {
      logger.error('PaystackProvider.verifyWebhook: invalid JSON', err)
      return null
    }

    if (parsed.event !== 'charge.success') return null

    const data = parsed.data
    return {
      reference: String(data.reference),
      amount: Number(data.amount) / 100,
      status: 'success',
      channel: typeof data.channel === 'string' ? data.channel : null,
      metadata: (data.metadata as Record<string, unknown>) ?? {},
    }
  }
}
