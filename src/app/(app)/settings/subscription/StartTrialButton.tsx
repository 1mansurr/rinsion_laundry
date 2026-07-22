'use client'

import { useState, useTransition } from 'react'
import { startTrial } from '@/services/subscriptions/startTrial'
import { Button } from '@/components/ui/Button'

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
      {error && <p className="text-error">{error}</p>}
      <Button onClick={handleStartTrial} isPending={isPending}>
        Start free trial
      </Button>
    </>
  )
}
