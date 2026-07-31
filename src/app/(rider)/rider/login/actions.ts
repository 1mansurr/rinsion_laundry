'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import * as authService from '@/services/auth/signIn'

export async function riderSignIn(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const phone = formData.get('phone') as string
  const password = formData.get('password') as string

  if (!phone) return { error: 'Phone number is required.' }
  if (!password) return { error: 'Password is required.' }

  const result = await authService.signIn({ phone, password })
  if (!result.success) return { error: result.error }

  redirect('/rider')
}

export async function riderSignOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/rider/login')
}
