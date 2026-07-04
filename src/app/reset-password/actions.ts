'use server'

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export async function updatePassword(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Reset link expired or invalid. Please request a new one.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  await supabase.auth.signOut()
  redirect('/login')
}
