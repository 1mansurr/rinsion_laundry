/**
 * lib/push/sendExpoPush.ts
 *
 * Sends a push notification through Expo's push service via a plain HTTP
 * call — no expo-server-sdk dependency needed, same reasoning as
 * lib/sms/mnotify.ts calling its provider's REST API directly with fetch.
 * Best-effort only: callers (assignRiderToJob.ts, /api/mobile/rider/queue)
 * already write the in-app rider_notifications row regardless of whether
 * this succeeds, so a failure here is logged, never thrown.
 */

import { logger } from '@/lib/logger'

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send'

export async function sendExpoPush(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const res = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({ to: expoPushToken, title, body, sound: 'default', priority: 'high', data }),
    })

    const json = await res.json().catch(() => null) as { data?: { status: string; message?: string } } | null
    if (json?.data?.status !== 'ok') {
      logger.error('sendExpoPush: send failed', { expoPushToken, response: json })
    }
  } catch (err) {
    logger.error('sendExpoPush: network error', err)
  }
}
