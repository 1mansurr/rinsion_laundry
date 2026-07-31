'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteRider } from '@/services/riders/inviteRider'
import type { RosterRider } from '@/services/riders/getRoster'
import type { PendingRiderInvite } from '@/services/riders/getPendingRiderInvites'

interface Props {
  riders: RosterRider[]
  invites: PendingRiderInvite[]
}

export function RosterList({ riders, invites }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function handleInvite() {
    if (!phone.trim()) { setError('Phone number is required.'); return }
    setError(null)
    setInviteLink(null)
    startTransition(async () => {
      const res = await inviteRider({ phone: phone.trim() })
      if (!res.success) { setError(res.error); return }
      setPhone('')
      if (res.data.inviteLink) setInviteLink(res.data.inviteLink)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-warm-300 rounded-18 p-4 space-y-3">
        <p className="text-label font-medium text-warm-700">Invite a rider</p>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-12 px-3 py-2 text-caption text-red-700">{error}</div>
        )}
        {inviteLink && (
          <div className="bg-brand-pale border border-brand/30 rounded-12 px-3 py-2 space-y-1.5">
            <p className="text-caption text-warm-700">Forward this link to the rider yourself — no SMS is sent.</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 border border-warm-300 rounded-12 px-2 py-1.5 text-caption text-warm-950 bg-white"
              />
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true) }}
                className="border border-warm-300 rounded-12 px-3 py-1.5 text-caption font-medium text-warm-800 bg-white hover:bg-warm-100 transition-colors"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="024 123 4567"
            className="flex-1 border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <button
            onClick={handleInvite}
            disabled={isPending}
            className="bg-brand text-[#FAF8F5] px-4 py-2 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Inviting…' : 'Invite'}
          </button>
        </div>
      </div>

      <div>
        <p className="text-label font-medium text-warm-700 mb-2">Riders ({riders.length})</p>
        <div className="bg-white border border-warm-300 rounded-18 divide-y divide-warm-200">
          {riders.length === 0 && (
            <p className="px-4 py-3 text-caption text-warm-500">No riders yet.</p>
          )}
          {riders.map(r => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-ui text-warm-950">{r.firstName} {r.lastName}</p>
                <p className="text-caption text-warm-500">{r.phone}</p>
              </div>
              <span className="text-caption text-warm-500">
                {r.role === 'admin' ? 'Admin' : 'Rider'}{!r.isActive ? ' · Inactive' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {invites.length > 0 && (
        <div>
          <p className="text-label font-medium text-warm-700 mb-2">Pending invites ({invites.length})</p>
          <div className="bg-white border border-warm-300 rounded-18 divide-y divide-warm-200">
            {invites.map(i => (
              <div key={i.id} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-ui text-warm-950">{i.phone}</p>
                <span className="text-caption text-warm-500">Invited</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
