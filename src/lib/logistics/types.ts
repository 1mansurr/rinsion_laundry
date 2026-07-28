/**
 * lib/logistics/types.ts
 *
 * Provider-agnostic logistics interface, mirroring lib/sms/types.ts exactly.
 * Service functions (services/pickupRequests/, services/logistics/) target
 * this interface; provider-specific code stays inside its own lib/logistics/
 * file. Operations are the doc's own "Standard Logistics Operations" list
 * (docs/customer-portal+rider.md) — every real courier integration must
 * expose the same set regardless of which company actually fulfills a
 * request.
 *
 * Like SmsProvider, these methods never touch the database themselves — the
 * calling service is responsible for reading/writing logistics_requests rows
 * (same separation as sendSms.ts owning sms_messages, not lib/sms/mnotify.ts).
 */

export interface LogisticsRequestContext {
  laundryId: string
  orderId: string
}

export interface LogisticsResult {
  success: boolean
  providerRefId?: string
  errorMessage?: string
}

export interface RiderAssignment {
  riderName: string | null
  riderPhone: string | null
}

export interface LogisticsStatus {
  status: string
}

export interface LogisticsProvider {
  createPickupRequest(ctx: LogisticsRequestContext): Promise<LogisticsResult>
  cancelPickupRequest(providerRefId: string | null): Promise<LogisticsResult>
  createDeliveryRequest(ctx: LogisticsRequestContext): Promise<LogisticsResult>
  cancelDeliveryRequest(providerRefId: string | null): Promise<LogisticsResult>
  getRiderAssignment(providerRefId: string | null): Promise<RiderAssignment>
  trackPickupStatus(providerRefId: string | null): Promise<LogisticsStatus>
  trackDeliveryStatus(providerRefId: string | null): Promise<LogisticsStatus>
  confirmPickup(providerRefId: string | null): Promise<LogisticsResult>
  confirmDelivery(providerRefId: string | null): Promise<LogisticsResult>
  /** Only meaningful for a real webhook-emitting provider — the manual provider has none to verify. */
  verifyWebhook?(payload: string, signature: string): boolean
}
