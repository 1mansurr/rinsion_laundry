'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Banner } from '@/components/ui/Banner'

const MESSAGES: Record<string, string> = {
  unauthorized: "You don't have permission to view that page.",
}

/** Picks up ?error=<code> (e.g. set by the internal-tools layout redirecting
 * a non-platform-admin back here) and shows a dismissable banner instead of
 * a 404. Strips the param from the URL immediately so a refresh/back-nav
 * doesn't re-show it. */
export function UnauthorizedNotice() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const errorParam = searchParams.get('error')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!errorParam) return
    setMessage(MESSAGES[errorParam] ?? "You don't have permission to do that.")

    const params = new URLSearchParams(searchParams.toString())
    params.delete('error')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    // Only re-run when the param itself changes, not on every searchParams/router identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorParam])

  if (!message) return null

  return (
    <div className="px-4 pt-2.5">
      <Banner variant="destructive" dismissable onDismiss={() => setMessage(null)}>
        {message}
      </Banner>
    </div>
  )
}
