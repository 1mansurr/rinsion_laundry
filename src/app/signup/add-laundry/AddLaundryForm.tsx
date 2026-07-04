'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createLaundrySelfServe } from '@/services/laundries/createLaundrySelfServe'
import { Wordmark } from '@/components/ui/Wordmark'

export function AddLaundryForm() {
  const router = useRouter()
  const [laundryName, setLaundryName] = useState('')
  const [laundryCode, setLaundryCode] = useState('')
  const [branchName, setBranchName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!laundryName.trim() || !laundryCode.trim()) {
      setError('Laundry name and code are required.')
      return
    }
    setError('')
    startTransition(async () => {
      const res = await createLaundrySelfServe({
        laundryName: laundryName.trim(),
        laundryCode: laundryCode.toUpperCase().trim(),
        branchName: branchName.trim(),
      })
      if (!res.success) { setError(res.error); return }
      router.push('/onboarding')
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">Tell us about your laundry</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-10 border border-warm-300 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-7 px-3 py-2 text-ui text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-label font-medium text-warm-800 mb-1">Laundry name</label>
            <input
              value={laundryName}
              onChange={e => setLaundryName(e.target.value)}
              required
              placeholder="e.g. Bright Clean Laundry"
              className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-label font-medium text-warm-800 mb-1">Laundry code</label>
            <input
              value={laundryCode}
              onChange={e => setLaundryCode(e.target.value)}
              required
              placeholder="BRIGHTCLEAN"
              className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
            <p className="text-caption text-warm-400 mt-1">
              Uppercase letters and numbers only — a unique identifier for your business.
            </p>
          </div>

          <div>
            <label className="block text-label font-medium text-warm-800 mb-1">Branch name (optional)</label>
            <input
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              placeholder="e.g. Main Branch"
              className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-7 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Creating…' : 'Create laundry'}
          </button>
        </form>
      </div>
    </main>
  )
}
