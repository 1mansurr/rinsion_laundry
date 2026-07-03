import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ authenticated: false, hasEmployee: false })

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ authenticated: true, hasEmployee: !!emp })
}
