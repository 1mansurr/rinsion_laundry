'use server'

import { redirect } from 'next/navigation'
import * as employeesService from '@/services/employees/acceptInvite'

export async function acceptInvite(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const token = formData.get('token') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const result = await employeesService.acceptInvite({ token, firstName, lastName, password })
  if (!result.success) return { error: result.error }

  // Account creation always succeeded here — signedIn only reflects whether
  // the auto-sign-in also worked. If it didn't, send them to /login to sign
  // in manually rather than redirecting to /dashboard on no session at all
  // (which would otherwise silently fall through to whatever session, if
  // any, was already active in that browser).
  redirect(result.data.signedIn ? '/dashboard' : '/login')
}
