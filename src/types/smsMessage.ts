/**
 * types/smsMessage.ts
 *
 * TypeScript types for the sms_messages table.
 * Spec reference: Rinsion_Database_Diagram.md → Notifications section
 */

import type { SmsTriggerEvent } from '@/constants/subscriptionStatuses'

export type SmsStatus = 'queued' | 'sent' | 'failed'

export interface SmsMessage {
  id: string
  laundryId: string
  orderId: string | null
  customerId: string | null
  phone: string
  message: string
  triggerEvent: SmsTriggerEvent
  provider: string
  providerMessageId: string | null
  status: SmsStatus
  /** Set at send time — not recomputed later. See Rinsion_Technical_Overview.md §11 */
  countsTowardCap: boolean
  createdAt: string
  sentAt: string | null
  failedAt: string | null
  errorMessage: string | null
}
