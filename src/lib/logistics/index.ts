/**
 * lib/logistics/index.ts
 *
 * Exports the active logistics provider. To swap providers (e.g. manual →
 * a real courier API), change only this file and implement the
 * LogisticsProvider interface in the new module — same shape as lib/sms/index.ts.
 */

import { ManualLogisticsProvider } from './manualProvider'
import type { LogisticsProvider } from './types'

export const logisticsProvider: LogisticsProvider = new ManualLogisticsProvider()

export type { LogisticsProvider, LogisticsResult, LogisticsRequestContext, RiderAssignment, LogisticsStatus } from './types'
