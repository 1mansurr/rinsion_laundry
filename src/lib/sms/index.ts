/**
 * lib/sms/index.ts
 *
 * Exports the active SMS provider. To swap providers (e.g. mNotify → Arkesel),
 * change only this file and implement the SmsProvider interface in the new module.
 *
 * Spec reference: Rinsion_Technical_Overview.md §11 (SMS Provider Abstraction)
 */

import { MnotifyProvider } from './mnotify'
import type { SmsProvider } from './types'

export const smsProvider: SmsProvider = new MnotifyProvider()

export type { SmsProvider, SmsResult } from './types'
