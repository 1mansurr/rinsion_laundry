'use server'

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export async function signUp(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const firstName = (formData.get('firstName') as string)?.trim()
  const lastName = (formData.get('lastName') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()

  if (!email || !password || !firstName || !phone) {
    return { error: 'Email, password, first name, and phone are required.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName, phone },
    },
  })

  if (error) return { error: error.message }

  // No session means email confirmation is required before the account is usable.
  if (!data.session) {
    redirect('/signup/check-email')
  }

  redirect('/signup/choose')
}
