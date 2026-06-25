/**
 * lib/sms/mnotify.ts
 *
 * Concrete SmsProvider implementation using mNotify (Ghana-based SMS provider).
 * All mNotify SDK / API calls are isolated here.
 *
 * Phase 1 stub: returns mock success so the rest of the system can be tested
 * without a live mNotify API key. Replace the body of sendSms() in Phase 6
 * when wiring up the real mNotify integration.
 *
 * Spec reference: Rinsion_Technical_Overview.md §11 (SMS via mNotify)
 */

import { logger } from '@/lib/logger'
import type { SmsProvider, SmsResult } from './types'

export class MnotifyProvider implements SmsProvider {
  private readonly apiKey: string

  constructor() {
    this.apiKey = process.env.MNOTIFY_API_KEY ?? ''
  }

  /**
   * Sends an SMS message via mNotify.
   *
   * TODO (Phase 6): Replace stub implementation with real mNotify HTTP call.
   * Reference: https://developers.mnotify.com/docs/
   */
  async sendSms(phoneNumber: string, message: string, senderId: string): Promise<SmsResult> {
    logger.info('MnotifyProvider.sendSms (stub)', { phoneNumber, message, senderId })

    // Phase 1 stub — always returns success
    return {
      success: true,
      providerMessageId: `stub-${Date.now()}`,
    }
  }
}
