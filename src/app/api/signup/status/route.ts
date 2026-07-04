import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getVerifiedUserId } from '@/lib/auth'

export async function GET() {
  const supabase = createClient()
  const userId = await getVerifiedUserId(supabase)
  if (!userId) return NextResponse.json({ authenticated: false, hasEmployee: false })

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  return NextResponse.json({ authenticated: true, hasEmployee: !!emp })
}
