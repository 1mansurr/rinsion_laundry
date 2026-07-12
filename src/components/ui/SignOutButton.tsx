'use client'

import { signOut } from '@/app/login/actions'

// A plain link to /login won't work for a signed-in user mid-signup/onboarding —
// middleware bounces authenticated sessions away from /login straight back to
// /dashboard (which itself redirects incomplete-onboarding admins right back
// here). Signing out first breaks that loop.
export function SignOutButton({ className = '' }: { className?: string }) {
  return (
    <form action={signOut} className="inline">
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  )
}
