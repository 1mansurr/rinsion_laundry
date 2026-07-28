/**
 * lib/logistics/manualProvider.ts
 *
 * The only LogisticsProvider implementation this phase: no real courier API
 * exists yet — docs/customer-portal+rider.md notes real integration needs
 * business partnerships that haven't happened. Every method is a no-op from
 * the provider's own perspective; staff assign riders and update status by
 * hand in the dashboard (services/pickupRequests/, services/logistics/),
 * which own writing logistics_requests rows regardless of provider.
 *
 * This class exists so the LogisticsProvider seam is real from day one —
 * swapping in an actual courier later means writing one new class and
 * changing lib/logistics/index.ts, not touching order/approval logic
 * anywhere else.
 */

import type {
  LogisticsProvider,
  LogisticsRequestContext,
  LogisticsResult,
  RiderAssignment,
  LogisticsStatus,
} from './types'

export class ManualLogisticsProvider implements LogisticsProvider {
  async createPickupRequest(_ctx: LogisticsRequestContext): Promise<LogisticsResult> {
    return { success: true }
  }

  async cancelPickupRequest(_providerRefId: string | null): Promise<LogisticsResult> {
    return { success: true }
  }

  async createDeliveryRequest(_ctx: LogisticsRequestContext): Promise<LogisticsResult> {
    return { success: true }
  }

  async cancelDeliveryRequest(_providerRefId: string | null): Promise<LogisticsResult> {
    return { success: true }
  }

  async getRiderAssignment(_providerRefId: string | null): Promise<RiderAssignment> {
    return { riderName: null, riderPhone: null }
  }

  async trackPickupStatus(_providerRefId: string | null): Promise<LogisticsStatus> {
    return { status: 'requested' }
  }

  async trackDeliveryStatus(_providerRefId: string | null): Promise<LogisticsStatus> {
    return { status: 'requested' }
  }

  async confirmPickup(_providerRefId: string | null): Promise<LogisticsResult> {
    return { success: true }
  }

  async confirmDelivery(_providerRefId: string | null): Promise<LogisticsResult> {
    return { success: true }
  }
}
