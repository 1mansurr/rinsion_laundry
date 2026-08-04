import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface EmployeeProfile {
  kind: 'employee'
  id: string
  laundryId: string
  role: 'admin' | 'employee'
  firstName: string
  lastName: string
  laundryName: string
}

export interface RiderProfile {
  kind: 'rider'
  id: string
  riderCompanyId: string
  role: 'admin' | 'rider'
  firstName: string
  lastName: string
}

export type AppProfile = EmployeeProfile | RiderProfile | null

interface AuthContextValue {
  session: Session | null
  profile: AppProfile
  /** True until the initial session + profile lookup finishes. */
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Same single shared auth.users identity space as the website (see
// docs/new.md) — a signed-in account is either an employees row or a riders
// row (never both in practice). Mirrors getMyProfile.ts/getMyRiderProfile.ts
// but as a direct client-side query, since the app has no server layer of
// its own for this simple, RLS-covered lookup.
async function loadProfile(userId: string): Promise<AppProfile> {
  const { data: employee } = await supabase
    .from('employees')
    .select('id, laundry_id, role, first_name, last_name, laundries(name)')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (employee) {
    const laundry = employee.laundries as unknown as { name: string } | null
    return {
      kind: 'employee',
      id: employee.id,
      laundryId: employee.laundry_id,
      role: employee.role,
      firstName: employee.first_name,
      lastName: employee.last_name,
      laundryName: laundry?.name ?? '',
    }
  }

  const { data: rider } = await supabase
    .from('riders')
    .select('id, rider_company_id, role, first_name, last_name')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (rider) {
    return {
      kind: 'rider',
      id: rider.id,
      riderCompanyId: rider.rider_company_id,
      role: rider.role,
      firstName: rider.first_name,
      lastName: rider.last_name,
    }
  }

  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppProfile>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap(nextSession: Session | null) {
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setIsLoading(false)
        return
      }
      const nextProfile = await loadProfile(nextSession.user.id)
      if (!cancelled) {
        setProfile(nextProfile)
        setIsLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => bootstrap(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setIsLoading(true)
      bootstrap(nextSession)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
