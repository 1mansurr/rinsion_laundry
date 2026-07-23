'use client'

import { useState, useTransition } from 'react'
import { updateLaundryName } from '@/services/settings/updateLaundryName'
import { regenerateJoinPin } from '@/services/settings/regenerateJoinPin'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SmsPreview } from '@/components/app/SmsPreview'
import { buildOrderReadySmsPreview } from '@/utils/smsPreview'

export function LaundryForm({ currentName, laundryCode, joinPin: initJoinPin }: { currentName: string; laundryCode: string; joinPin: string }) {
  const [name, setName] = useState(currentName)
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [joinPin, setJoinPin] = useState(initJoinPin)
  const [pinPending, startPinTransition] = useTransition()
  const [pinError, setPinError] = useState<string | null>(null)

  function handleSave() {
    if (name.trim() === currentName) return
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const res = await updateLaundryName(name)
      if (res.success) setSuccess(true)
      else setError(res.error)
    })
  }

  function handleRegeneratePin() {
    setPinError(null)
    startPinTransition(async () => {
      const res = await regenerateJoinPin()
      if (res.success) setJoinPin(res.data.joinPin)
      else setPinError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-warm-800 mb-1">Laundry Code</label>
        <p className="text-sm font-mono text-warm-600 bg-warm-100 border border-warm-300 rounded-10 px-3 py-2">
          {laundryCode}
        </p>
        <p className="text-xs text-warm-600 mt-1">This code cannot be changed.</p>
      </div>

      <Input
        label="Laundry Name"
        value={name}
        onChange={e => { setName(e.target.value); setSuccess(false) }}
      />

      <SmsPreview
        message={buildOrderReadySmsPreview(name)}
        helpText="Sent to customers when their order is ready for collection."
      />

      {error && <p className="text-sm text-error">{error}</p>}
      {success && <p className="text-sm text-success-fg">Name updated.</p>}

      <Button
        size="sm"
        onClick={handleSave}
        isPending={isPending}
        disabled={!name.trim() || name.trim() === currentName}
      >
        Save
      </Button>

      <div className="pt-2 border-t border-warm-300">
        <label className="block text-xs font-medium text-warm-800 mb-1">Join PIN</label>
        <p className="text-xs text-warm-600 mb-2">
          Share this with staff so they can request to join from the signup page. Regenerate it if it leaks.
        </p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-mono tracking-[0.3em] text-warm-950 bg-warm-100 border border-warm-300 rounded-10 px-3 py-2">
            {joinPin}
          </p>
          <Button size="sm" variant="secondary" onClick={handleRegeneratePin} isPending={pinPending}>
            Regenerate
          </Button>
        </div>
        {pinError && <p className="text-sm text-error mt-1">{pinError}</p>}
      </div>
    </div>
  )
}
