'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { signIn } from './actions'
import { Wordmark } from '@/components/ui/Wordmark'

const initialState = { error: null }

export default function LoginPage() {
  const [state, action] = useFormState(signIn, initialState)
  const [identity, setIdentity] = useState<'phone' | 'email'>('phone')

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">Sign in to your laundry account</p>
        </div>

        <form action={action} className="bg-white rounded-10 border border-warm-300 p-6 space-y-4">
          {state.error && (
            <div className="bg-red-50 border border-red-200 rounded-7 px-3 py-2 text-ui text-red-700">
              {state.error}
            </div>
          )}

          <input type="hidden" name="identity" value={identity} />

          <div className="flex rounded-7 border border-warm-300 p-1">
            <button
              type="button"
              aria-pressed={identity === 'phone'}
              onClick={() => setIdentity('phone')}
              className={`flex-1 rounded-5 py-1.5 text-ui font-medium transition-colors ${
                identity === 'phone' ? 'bg-brand text-[#FAF8F5]' : 'text-warm-600 hover:text-warm-800'
              }`}
            >
              Phone
            </button>
            <button
              type="button"
              aria-pressed={identity === 'email'}
              onClick={() => setIdentity('email')}
              className={`flex-1 rounded-5 py-1.5 text-ui font-medium transition-colors ${
                identity === 'email' ? 'bg-brand text-[#FAF8F5]' : 'text-warm-600 hover:text-warm-800'
              }`}
            >
              Email
            </button>
          </div>

          {identity === 'phone' ? (
            <div key="phone">
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
                className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="024 123 4567"
              />
            </div>
          ) : (
            <div key="email">
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
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-label font-medium text-warm-800">
                Password
              </label>
              <Link href="/forgot-password" className="text-caption text-brand hover:text-brand-hover underline underline-offset-2">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <SubmitButton />

          <p className="text-center text-caption text-warm-500">
            New here?{' '}
            <Link href="/signup" className="text-brand hover:text-brand-hover underline underline-offset-2">
              Create an account
            </Link>
          </p>
        </form>
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
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  )
}
