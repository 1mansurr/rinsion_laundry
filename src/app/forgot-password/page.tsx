'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { requestPasswordReset } from './actions'
import { Wordmark } from '@/components/ui/Wordmark'

const initialState = { error: null, sent: false }

export default function ForgotPasswordPage() {
  const [state, action] = useFormState(requestPasswordReset, initialState)

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">Reset your password</p>
        </div>

        {state.sent ? (
          <div className="bg-white rounded-10 border border-warm-300 p-6 space-y-3 text-center">
            <p className="text-ui font-semibold text-warm-950">Check your email</p>
            <p className="text-body text-warm-600">
              If an account exists for that address, we&apos;ve sent a link to reset your password.
            </p>
            <Link
              href="/login"
              className="inline-block mt-2 text-caption text-brand hover:text-brand-hover underline underline-offset-2"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form action={action} className="bg-white rounded-10 border border-warm-300 p-6 space-y-4">
            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-7 px-3 py-2 text-ui text-red-700">
                {state.error}
              </div>
            )}

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

            <SubmitButton />

            <p className="text-center text-caption text-warm-500">
              <Link href="/login" className="text-brand hover:text-brand-hover underline underline-offset-2">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-7 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Sending…' : 'Send reset link'}
    </button>
  )
}
