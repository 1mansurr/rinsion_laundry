import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getVerifiedUserId } from '@/lib/auth'

export default async function HomePage() {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)

  if (!userId) redirect('/login')

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  // Signed up but hasn't finished Add Laundry / Join Laundry yet
  redirect(emp ? '/dashboard' : '/signup/choose')
}
