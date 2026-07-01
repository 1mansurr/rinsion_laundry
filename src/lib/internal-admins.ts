import { INTERNAL_ADMIN_EMAILS } from '@/constants/internalAdmins'

export { INTERNAL_ADMIN_EMAILS }

export function isInternalAdminEmail(email: string): boolean {
  return INTERNAL_ADMIN_EMAILS.includes(email)
}
