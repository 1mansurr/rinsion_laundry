'use client'

import { useState, useTransition } from 'react'
import { addPlatformAdmin } from '@/services/platform/addPlatformAdmin'
import { removePlatformAdmin } from '@/services/platform/removePlatformAdmin'
import type { PlatformAdminRow } from '@/services/platform/listPlatformAdmins'

interface Props {
  admins: PlatformAdminRow[]
  currentAdminId: string
}

export function PlatformAdminsClient({ admins: init, currentAdminId }: Props) {
  const [admins, setAdmins] = useState(init)
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  function handleAdd() {
    const value = identifier.trim()
    if (!value) { setError('Enter an email or phone number.'); return }
    setError(null)
    startTransition(async () => {
      const isEmail = value.includes('@')
      const res = await addPlatformAdmin(isEmail ? { email: value } : { phone: value })
      if (!res.success) { setError(res.error); return }
      setIdentifier('')
      // Re-derive from the server on next load — the added admin's email/phone
      // display needs a lookup this form doesn't have locally.
      window.location.reload()
    })
  }

  function handleRemove(id: string) {
    setError(null)
    setRemovingId(id)
    startTransition(async () => {
      const res = await removePlatformAdmin(id)
      if (res.success) {
        setAdmins(prev => prev.filter(a => a.id !== id))
      } else {
        setError(res.error)
      }
      setRemovingId(null)
    })
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-12 px-4 py-3 text-ui text-red-700">{error}</div>
      )}

      <div className="bg-white border border-warm-300 rounded-18 p-5 space-y-3">
        <p className="text-label font-medium text-warm-700">Add platform admin</p>
        <p className="text-caption text-warm-500">
          They must already have a Rinsion account (as an employee or another platform admin) — this only grants access, it doesn&apos;t create one.
        </p>
        <div className="flex gap-2">
          <input
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="email or phone"
            className="flex-1 border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            onClick={handleAdd}
            disabled={isPending}
            className="px-4 py-2 bg-brand text-[#FAF8F5] rounded-12 text-ui font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
          >
            {isPending && removingId === null ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-warm-300 rounded-18 divide-y divide-warm-200">
        {admins.length === 0 && (
          <p className="text-ui text-warm-500 text-center py-8">No platform admins yet.</p>
        )}
        {admins.map(a => (
          <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-ui font-medium text-warm-950">
                {a.email ?? a.phone ?? a.authUserId}
                {a.id === currentAdminId && <span className="text-caption text-warm-400 font-normal ml-1">(you)</span>}
              </p>
              {a.email && a.phone && <p className="text-caption text-warm-500 mt-0.5">{a.phone}</p>}
            </div>
            {a.id !== currentAdminId && (
              <button
                onClick={() => handleRemove(a.id)}
                disabled={isPending && removingId === a.id}
                className="text-caption text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
