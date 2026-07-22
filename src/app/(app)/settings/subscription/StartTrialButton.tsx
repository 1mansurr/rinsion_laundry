'use client'

import { useState, useTransition } from 'react'
import { startTrial } from '@/services/subscriptions/startTrial'

export function StartTrialButton() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleStartTrial() {
    setError(null)
    startTransition(async () => {
      const res = await startTrial()
      if (res.success) window.location.reload()
      else setError(res.error)
    })
  }

  return (
    <>
      {error && <p className="text-red-700">{error}</p>}
      <button
        onClick={handleStartTrial}
        disabled={isPending}
        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-12 hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Starting…' : 'Start free trial'}
      </button>
    </>
  )
}
