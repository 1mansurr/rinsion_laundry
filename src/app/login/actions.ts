'use server'

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import * as authService from '@/services/auth/signIn'

export async function signIn(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const identity = formData.get('identity') as 'phone' | 'email'
  const password = formData.get('password') as string

  if (!password) {
    return { error: 'Password is required.' }
  }

  let result: Awaited<ReturnType<typeof authService.signIn>>
  if (identity === 'phone') {
    const phone = formData.get('phone') as string
    if (!phone) return { error: 'Phone number is required.' }
    result = await authService.signIn({ phone, password })
  } else {
    const email = formData.get('email') as string
    if (!email) return { error: 'Email is required.' }
    result = await authService.signIn({ email, password })
  }

  if (!result.success) {
    return { error: result.error }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
