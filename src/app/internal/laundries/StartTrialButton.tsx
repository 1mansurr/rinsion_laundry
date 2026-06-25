'use client'

import { useState, useTransition } from 'react'
import { startTrial } from '@/services/admin/startTrial'

export function StartTrialButton({ laundryId }: { laundryId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const res = await startTrial(laundryId)
      if (!res.success) setError(res.error)
    })
  }

  if (error) {
    return <span className="text-xs text-red-600">{error}</span>
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isPending ? 'Starting…' : 'Start Trial'}
    </button>
  )
}
