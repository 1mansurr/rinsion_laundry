/**
 * lib/api.ts
 *
 * Calls into the website's Next.js API routes at /api/mobile/* — the
 * backend-for-the-app layer. Not every website feature can be reached with
 * a direct Supabase query from the phone: customer name/phone/order
 * location are encrypted at rest, and decrypting them needs a server-side
 * key that must never ship inside the app bundle. Those routes run the
 * same decrypt/service logic the website already has, gated by the
 * caller's Supabase access token instead of a cookie session.
 */

import { supabase } from '@/lib/supabase';

// Trailing slash stripped defensively — EXPO_PUBLIC_API_BASE_URL + a
// leading-slash path (e.g. "/api/mobile/orders") would otherwise double up.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

/**
 * Thrown when the request never reached the server at all (no connectivity,
 * DNS failure, timeout) — distinguishable from a request that DID reach the
 * server and got a real error response. The offline queue (lib/offlineQueue.ts)
 * only queues actions that fail this way; a genuine validation/business
 * error should surface to the user immediately, not get queued and retried.
 */
export class NetworkError extends Error {}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not set — point it at the deployed website (or your local dev server\'s LAN IP) in mobile/.env.'
    );
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in.');

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    throw new NetworkError(err instanceof Error ? err.message : 'Network request failed.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }

  return response;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await authedFetch(path);
  return response.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await authedFetch(path, { method: 'POST', body: JSON.stringify(body) });
  return response.json();
}
