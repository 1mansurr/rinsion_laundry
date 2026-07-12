import { headers } from 'next/headers'

/**
 * Derives the current deployment's origin from request headers, same
 * pattern already used in app/forgot-password/actions.ts. Never hardcode a
 * domain here — rinsion.app isn't a registered/configured custom domain
 * yet, and a hardcoded link silently 404s in every environment (local,
 * Vercel preview, and production) until that changes.
 */
export function getBaseUrl(): string {
  const headerList = headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const proto = headerList.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}
