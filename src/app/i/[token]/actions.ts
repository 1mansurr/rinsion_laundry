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

  redirect('/dashboard')
}
