/**
 * lib/logger.ts
 *
 * Centralised logging for service-layer errors.
 * Keeps technical details out of user-facing error messages.
 *
 * Production: swap console for a proper logging service (e.g. Axiom, Logtail).
 */

export const logger = {
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error ?? '')
  },

  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data ?? '')
  },

  info: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[INFO] ${message}`, data ?? '')
    }
  },
}
