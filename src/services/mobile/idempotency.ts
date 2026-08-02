import type { createAdminClient } from '@/lib/supabase'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Backs the mobile app's offline-queue retries (M5): a create-order or
 * record-payment request that actually succeeded but whose response never
 * reached the phone (dropped connection) must not redo the write on retry.
 * Callers check this before doing the real work, and store the response
 * after, keyed on a client-generated UUID. See migration
 * 20240042000000_mobile_idempotency_keys.sql.
 */
export async function findIdempotentResponse<T>(
  admin: AdminClient,
  laundryId: string,
  clientRequestId: string
): Promise<T | null> {
  const { data } = await admin
    .from('mobile_idempotency_keys')
    .select('response_json')
    .eq('laundry_id', laundryId)
    .eq('client_request_id', clientRequestId)
    .maybeSingle()
  return (data?.response_json as T) ?? null
}

export async function storeIdempotentResponse(
  admin: AdminClient,
  laundryId: string,
  clientRequestId: string,
  response: unknown
): Promise<void> {
  // Best-effort — a failure here (e.g. a genuine concurrent duplicate,
  // vanishingly unlikely since the mobile queue replays sequentially from
  // one device) shouldn't fail a request that otherwise succeeded.
  await admin
    .from('mobile_idempotency_keys')
    .insert({ laundry_id: laundryId, client_request_id: clientRequestId, response_json: response })
    .then(() => undefined, () => undefined)
}
