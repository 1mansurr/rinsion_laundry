'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 px-6 text-center">
      <div>
        <h2 className="text-h2 font-semibold text-warm-950 mb-2">Something went wrong</h2>
        <p className="text-body text-warm-700 max-w-sm mx-auto">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
      </div>
      <Button variant="primary" onClick={reset}>Try again</Button>
    </div>
  )
}
