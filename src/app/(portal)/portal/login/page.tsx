'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { requestOtp } from '@/services/customerAuth/requestOtp'
import { verifyOtp } from '@/services/customerAuth/verifyOtp'
import { Wordmark } from '@/components/ui/Wordmark'

export default function PortalLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">Sign in to track your laundry</p>
        </div>
        <Suspense fallback={null}>
          <PortalLoginFlow />
        </Suspense>
      </div>
    </main>
  )
}

// Same two-step phone/code shape as PhoneResetFlow (app/forgot-password/page.tsx):
// local step state + direct calls to the 'use server' functions rather than
// useFormState, since the flow branches on client-only state (which step to
// show) that a single form action can't express.
function PortalLoginFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/portal'

  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [code, setCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRequestCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await requestOtp(phone)
      if (!result.success) {
        setError(result.error)
        return
      }
      setStep('code')
    })
  }

  function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await verifyOtp({
        phone,
        code,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push(result.data.signedIn ? redirectTo : '/portal/login')
    })
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleVerifyCode} className="bg-white rounded-18 border border-warm-300 p-6 space-y-4">
        <p className="text-body text-warm-600">
          We&apos;ve texted a 6-digit code to {phone}.
        </p>
        {error && <ErrorBanner message={error} />}

        <div>
          <label htmlFor="code" className="block text-label font-medium text-warm-800 mb-1">
            Verification code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            placeholder="123456"
          />
        </div>

        <p className="text-caption text-warm-500">First time here? Tell us your name.</p>

        <div className="flex gap-2">
          <input
            type="text"
            aria-label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            placeholder="First name"
          />
          <input
            type="text"
            aria-label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            placeholder="Last name"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Verifying…' : 'Verify & continue'}
        </button>
        <button
          type="button"
          onClick={() => { setStep('phone'); setCode(''); setError(null) }}
          className="w-full text-center text-caption text-warm-500 hover:text-warm-800 transition-colors"
        >
          Use a different number
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleRequestCode} className="bg-white rounded-18 border border-warm-300 p-6 space-y-4">
      {error && <ErrorBanner message={error} />}

      <div>
        <label htmlFor="phone" className="block text-label font-medium text-warm-800 mb-1">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="024 123 4567"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Sending…' : 'Send code'}
      </button>
    </form>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-12 px-3 py-2 text-ui text-red-700">
      {message}
    </div>
  )
}
