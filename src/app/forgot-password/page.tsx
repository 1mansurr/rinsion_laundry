'use client'

import { useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { requestPasswordReset } from './actions'
import { requestPhoneReset, verifyPhoneResetCode } from '@/services/auth/phoneReset'
import { Wordmark } from '@/components/ui/Wordmark'
import { PasswordInput } from '@/components/ui/PasswordInput'

const initialState = { error: null, sent: false }

export default function ForgotPasswordPage() {
  const [state, action] = useFormState(requestPasswordReset, initialState)
  const [method, setMethod] = useState<'email' | 'phone'>('email')

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">Reset your password</p>
        </div>

        <div className="flex rounded-7 border border-warm-300 p-1 mb-4">
          <button
            type="button"
            aria-pressed={method === 'email'}
            onClick={() => setMethod('email')}
            className={`flex-1 rounded-5 py-1.5 text-ui font-medium transition-colors focus:outline-none focus:shadow-focus-ring ${
              method === 'email' ? 'bg-brand text-[#FAF8F5]' : 'text-warm-600 hover:text-warm-800'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            aria-pressed={method === 'phone'}
            onClick={() => setMethod('phone')}
            className={`flex-1 rounded-5 py-1.5 text-ui font-medium transition-colors focus:outline-none focus:shadow-focus-ring ${
              method === 'phone' ? 'bg-brand text-[#FAF8F5]' : 'text-warm-600 hover:text-warm-800'
            }`}
          >
            Phone
          </button>
        </div>

        {method === 'email' ? (
          state.sent ? (
            <div className="bg-white rounded-10 border border-warm-300 p-6 space-y-3 text-center">
              <p className="text-ui font-semibold text-warm-950">Check your email</p>
              <p className="text-body text-warm-600">
                If an account exists for that address, we&apos;ve sent a link to reset your password.
              </p>
              <BackToSignIn />
            </div>
          ) : (
            <form action={action} className="bg-white rounded-10 border border-warm-300 p-6 space-y-4">
              {state.error && <ErrorBanner message={state.error} />}

              <div>
                <label htmlFor="email" className="block text-label font-medium text-warm-800 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <SubmitButton label="Send reset link" pendingLabel="Sending…" />
              <BackToSignIn />
            </form>
          )
        ) : (
          <PhoneResetFlow />
        )}
      </div>
    </main>
  )
}

function PhoneResetFlow() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRequestCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await requestPhoneReset(phone)
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
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    startTransition(async () => {
      const result = await verifyPhoneResetCode({ phone, code, password })
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push(result.data.signedIn ? '/dashboard' : '/login')
    })
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleVerifyCode} className="bg-white rounded-10 border border-warm-300 p-6 space-y-4">
        <p className="text-body text-warm-600">
          If an account exists for that number, we&apos;ve texted a 6-digit code to {phone}.
        </p>
        {error && <ErrorBanner message={error} />}

        <div>
          <label htmlFor="code" className="block text-label font-medium text-warm-800 mb-1">
            Reset code
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
            className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            placeholder="123456"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-label font-medium text-warm-800 mb-1">
            New password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-label font-medium text-warm-800 mb-1">
            Confirm new password
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
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
          className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-7 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Saving…' : 'Save new password'}
        </button>
        <button
          type="button"
          onClick={() => { setStep('phone'); setError(null) }}
          className="w-full text-center text-caption text-warm-500 hover:text-warm-800 transition-colors"
        >
          Use a different number
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleRequestCode} className="bg-white rounded-10 border border-warm-300 p-6 space-y-4">
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
          className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          placeholder="024 123 4567"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-7 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Sending…' : 'Send reset code'}
      </button>
      <BackToSignIn />
    </form>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-7 px-3 py-2 text-ui text-red-700">
      {message}
    </div>
  )
}

function BackToSignIn() {
  return (
    <p className="text-center text-caption text-warm-500">
      <Link href="/login" className="text-brand hover:text-brand-hover underline underline-offset-2">
        Back to sign in
      </Link>
    </p>
  )
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-7 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
