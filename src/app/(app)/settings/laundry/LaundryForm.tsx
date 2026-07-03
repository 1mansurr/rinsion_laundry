'use client'

import { useState, useTransition } from 'react'
import { updateLaundryName, regenerateJoinPin } from '@/services/settings'

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
        <label className="block text-xs font-medium text-gray-700 mb-1">Laundry Code</label>
        <p className="text-sm font-mono text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          {laundryCode}
        </p>
        <p className="text-xs text-gray-400 mt-1">This code cannot be changed.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Laundry Name</label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setSuccess(false) }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">Name updated.</p>}

      <button
        onClick={handleSave}
        disabled={isPending || !name.trim() || name.trim() === currentName}
        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>

      <div className="pt-2 border-t border-gray-100">
        <label className="block text-xs font-medium text-gray-700 mb-1">Join PIN</label>
        <p className="text-xs text-gray-400 mb-2">
          Share this with staff so they can request to join from the signup page. Regenerate it if it leaks.
        </p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-mono tracking-[0.3em] text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {joinPin}
          </p>
          <button
            onClick={handleRegeneratePin}
            disabled={pinPending}
            className="px-3 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            {pinPending ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
        {pinError && <p className="text-sm text-red-600 mt-1">{pinError}</p>}
      </div>
    </div>
  )
}
