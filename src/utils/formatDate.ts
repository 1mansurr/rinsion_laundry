/**
 * utils/formatDate.ts
 *
 * Date formatting helpers. Dates are stored as ISO strings; formatted for display.
 */

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Returns the number of days remaining from now until targetDate. */
export function daysUntil(targetDate: string | Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/** Returns the number of days since pastDate. */
export function daysSince(pastDate: string | Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const past = new Date(pastDate)
  past.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24))
}
