'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Guards the Add Laundry / Join Laundry / choose steps: must be authenticated
 * (signed up already) but must not already belong to a laundry.
 */
export function SignupGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/signup/status').then(r => r.json()).then((data: { authenticated: boolean; hasEmployee: boolean }) => {
      if (!data.authenticated) { router.replace('/signup'); return }
      if (data.hasEmployee) { router.replace('/dashboard'); return }
      setReady(true)
    })
  }, [router])

  if (!ready) return null
  return <>{children}</>
}
