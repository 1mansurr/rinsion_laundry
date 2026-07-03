/**
 * utils/generateJoinPin.ts
 *
 * Generates a 6-digit numeric PIN a laundry shares with staff so they can
 * request to join it. Random — collisions are handled by the caller retrying
 * on the DB's unique constraint, same as pickup codes.
 */
export function generateJoinPin(): string {
  const code = Math.floor(Math.random() * 1000000)
  return code.toString().padStart(6, '0')
}
