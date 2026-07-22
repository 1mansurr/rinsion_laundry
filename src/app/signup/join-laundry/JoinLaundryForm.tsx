'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { submitJoinRequest, getMyJoinRequestStatus, type MyJoinRequestStatus } from '@/services/laundries/joinLaundry'
import { Wordmark } from '@/components/ui/Wordmark'
import { SignOutButton } from '@/components/ui/SignOutButton'

export function JoinLaundryForm() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<MyJoinRequestStatus | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Resume an in-flight request from a previous visit instead of showing the PIN form again
  useEffect(() => {
    getMyJoinRequestStatus().then(s => {
      if (s) { setStatus(s); setSubmitted(true) }
    })
  }, [])

  useEffect(() => {
    if (!submitted || status?.status !== 'pending') return
    pollRef.current = setInterval(async () => {
      const s = await getMyJoinRequestStatus()
      if (s) setStatus(s)
    }, 8000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [submitted, status?.status])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.trim().length < 4) {
      setError("Enter the PIN your laundry admin gave you.")
      return
    }
    setError('')
    startTransition(async () => {
      const res = await submitJoinRequest(pin.trim())
      if (!res.success) { setError(res.error); return }
      const s = await getMyJoinRequestStatus()
      setStatus(s)
      setSubmitted(true)
    })
  }

  if (submitted && status) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-caption text-warm-500">
            Wrong account?{' '}
            <SignOutButton className="text-brand hover:text-brand-hover underline underline-offset-2" />
          </p>
          <div className="bg-white rounded-18 border border-warm-300 p-6 mt-6 space-y-3">
            {status.status === 'pending' && (
              <>
                <p className="text-ui font-semibold text-warm-950">Request sent to {status.laundryName}</p>
                <p className="text-body text-warm-600">
                  Waiting for the admin to approve your request. This page updates automatically.
                </p>
              </>
            )}
            {status.status === 'approved' && (
              <>
                <p className="text-ui font-semibold text-warm-950">You&apos;re in! 🎉</p>
                <p className="text-body text-warm-600">{status.laundryName} approved your request.</p>
                <button
                  onClick={() => { window.location.href = '/dashboard' }}
                  className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-12 text-ui font-semibold hover:bg-brand-hover transition-colors mt-2"
                >
                  Go to dashboard
                </button>
              </>
            )}
            {status.status === 'rejected' && (
              <>
                <p className="text-ui font-semibold text-warm-950">Request not approved</p>
                <p className="text-body text-warm-600">
                  {status.laundryName} didn&apos;t approve this request. Check the PIN with your admin and try again.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setStatus(null); setPin('') }}
                  className="w-full border border-warm-300 rounded-12 py-2.5 px-4 text-ui font-semibold text-warm-800 hover:bg-warm-50 transition-colors mt-2"
                >
                  Try again
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">Enter your laundry&apos;s join PIN</p>
          <p className="text-caption text-warm-500 mt-2">
            Wrong account?{' '}
            <SignOutButton className="text-brand hover:text-brand-hover underline underline-offset-2" />
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-18 border border-warm-300 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-12 px-3 py-2 text-ui text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-label font-medium text-warm-800 mb-1">Join PIN</label>
            <input
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
            <p className="text-caption text-warm-400 mt-1">
              Ask your laundry admin for this — it&apos;s in their Settings.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Sending…' : 'Request to join'}
          </button>
        </form>
      </div>
    </main>
  )
}
