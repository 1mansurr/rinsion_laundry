'use server'

import { redirect } from 'next/navigation'
import { confirmPhoneReset } from '@/services/auth/phoneReset'

export async function resetPassword(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const token = formData.get('token') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const result = await confirmPhoneReset({ token, password })
  if (!result.success) return { error: result.error }

  // Password update always succeeded here — signedIn only reflects whether
  // the auto-sign-in also worked. Send to /login to sign in manually if not,
  // mirroring /i/[token]'s acceptInvite redirect logic.
  redirect(result.data.signedIn ? '/dashboard' : '/login')
}
