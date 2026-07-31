/**
 * lib/logistics/rinsionRiderNetworkProvider.ts
 *
 * The real LogisticsProvider implementation: Rinsion hosts its own rider
 * company/riders (supabase/migrations/20240040000000_rider_company_platform.sql)
 * rather than integrating an external courier's API. Every method here still
 * never touches logistics_requests directly (same separation as
 * ManualLogisticsProvider) — the calling service owns that write. The one
 * thing this provider adds is resolving which rider_companies row a new
 * request should route to; single active company by design this phase, see
 * the migration's own comment on why there's no matching/selection logic yet.
 */

import { createAdminClient } from '@/lib/supabase'
import type {
  LogisticsProvider,
  LogisticsRequestContext,
  LogisticsResult,
  RiderAssignment,
  LogisticsStatus,
} from './types'

async function getActiveRiderCompanyId(): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('rider_companies')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

export class RinsionRiderNetworkProvider implements LogisticsProvider {
  async createPickupRequest(_ctx: LogisticsRequestContext): Promise<LogisticsResult> {
    return { success: true, riderCompanyId: await getActiveRiderCompanyId() }
  }

  async cancelPickupRequest(_providerRefId: string | null): Promise<LogisticsResult> {
    return { success: true }
  }

  async createDeliveryRequest(_ctx: LogisticsRequestContext): Promise<LogisticsResult> {
    return { success: true, riderCompanyId: await getActiveRiderCompanyId() }
  }

  async cancelDeliveryRequest(_providerRefId: string | null): Promise<LogisticsResult> {
    return { success: true }
  }

  // Rider name/phone are read directly from riders/logistics_requests by the
  // dashboard and job views (assigned_rider_id), not through this generic
  // pair — kept as a stub only for interface compatibility.
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
