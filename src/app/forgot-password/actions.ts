'use server'

import { createClient } from '@/lib/supabase'
import { headers } from 'next/headers'

export async function requestPasswordReset(
  _prevState: { error: string | null; sent: boolean },
  formData: FormData
): Promise<{ error: string | null; sent: boolean }> {
  const email = (formData.get('email') as string)?.trim()
  if (!email) {
    return { error: 'Email is required.', sent: false }
  }

  const headerList = headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const proto = headerList.get('x-forwarded-proto') ?? 'https'
  const origin = `${proto}://${host}`

  const supabase = createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  // Always report success — don't reveal whether the email is registered.
  return { error: null, sent: true }
}
