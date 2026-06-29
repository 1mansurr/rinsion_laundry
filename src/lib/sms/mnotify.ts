/**
 * lib/sms/mnotify.ts
 *
 * Concrete SmsProvider implementation using mNotify (Ghana-based SMS provider).
 * All mNotify API calls are isolated here — nothing leaks out.
 *
 * Requires env vars:
 *   MNOTIFY_API_KEY    — API key from mNotify dashboard
 *   MNOTIFY_SENDER_ID  — Registered sender name (default: "Rinsion")
 *
 * Spec reference: Rinsion_Technical_Overview.md §11 (SMS via mNotify)
 */

import { logger } from '@/lib/logger'
import type { SmsProvider, SmsResult } from './types'

const MNOTIFY_API_URL = 'https://api.mnotify.com/api/sms/quick'

export class MnotifyProvider implements SmsProvider {
  private readonly apiKey: string
  private readonly senderId: string

  constructor() {
    this.apiKey = process.env.MNOTIFY_API_KEY ?? ''
    this.senderId = process.env.MNOTIFY_SENDER_ID ?? 'Rinsion'
  }

  async sendSms(phoneNumber: string, message: string, _senderId?: string): Promise<SmsResult> {
    if (!this.apiKey) {
      logger.error('MnotifyProvider: MNOTIFY_API_KEY is not set')
      return { success: false, errorMessage: 'SMS provider not configured.' }
    }

    const recipient = normalizePhone(phoneNumber)
    if (!recipient) {
      return { success: false, errorMessage: `Invalid phone number: ${phoneNumber}` }
    }

    try {
      const res = await fetch(`${MNOTIFY_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: [recipient],
          sender: this.senderId,
          message,
          is_schedule: 'false',
          schedule_date: '',
        }),
      })

      const json = await res.json() as { status: string; code: string; message: string; summary?: { sent: number } }

      if (json.status === 'success') {
        logger.info('MnotifyProvider: sent', { recipient, code: json.code })
        return { success: true, providerMessageId: json.code }
      }

      logger.error('MnotifyProvider: send failed', { recipient, response: json })
      return { success: false, errorMessage: json.message ?? 'Unknown error from mNotify' }
    } catch (err) {
      logger.error('MnotifyProvider: network error', err)
      return { success: false, errorMessage: 'Network error contacting mNotify' }
    }
  }
}

/** Normalise phone to mNotify-accepted format (0XXXXXXXXX for Ghana). */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('233') && digits.length === 12) return '0' + digits.slice(3)
  if (digits.startsWith('0') && digits.length === 10) return digits
  if (digits.length === 9) return '0' + digits  // bare 9-digit local number
  return null
}
