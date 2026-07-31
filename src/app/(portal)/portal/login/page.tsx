'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithPassword } from '@/services/customerAuth/signInWithPassword'
import { requestOtp } from '@/services/customerAuth/requestOtp'
import { verifyOtp } from '@/services/customerAuth/verifyOtp'
import { Wordmark } from '@/components/ui/Wordmark'
import { PasswordInput } from '@/components/ui/PasswordInput'

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

type Step = 'password' | 'phone' | 'code'

// Password is the normal path (no SMS cost per login); the phone/code path
// serves double duty as both first-time signup and forgot-password recovery
// — see verifyOtp.ts, which sets/resets the real password on a valid code.
function PortalLoginFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/portal'

  const [step, setStep] = useState<Step>('password')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await signInWithPassword(phone, password)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push(redirectTo)
    })
  }

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
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    startTransition(async () => {
      const result = await verifyOtp({
        phone,
        code,
        password: newPassword,
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

        <div>
          <label htmlFor="newPassword" className="block text-label font-medium text-warm-800 mb-1">
            Choose a password
          </label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
          <p className="text-caption text-warm-500 mt-1">You&apos;ll use this to sign in next time — no code needed.</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-label font-medium text-warm-800 mb-1">
            Confirm password
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
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

  if (step === 'phone') {
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
        <button
          type="button"
          onClick={() => { setStep('password'); setError(null) }}
          className="w-full text-center text-caption text-warm-500 hover:text-warm-800 transition-colors"
        >
          Have a password? Sign in directly
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handlePasswordSignIn} className="bg-white rounded-18 border border-warm-300 p-6 space-y-4">
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

      <div>
        <label htmlFor="password" className="block text-label font-medium text-warm-800 mb-1">
          Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
      <button
        type="button"
        onClick={() => { setStep('phone'); setError(null) }}
        className="w-full text-center text-caption text-warm-500 hover:text-warm-800 transition-colors"
      >
        New here or forgot password? Use a text code
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
