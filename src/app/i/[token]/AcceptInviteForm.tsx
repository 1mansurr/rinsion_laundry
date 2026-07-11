'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { acceptInvite } from './actions'
import { Wordmark } from '@/components/ui/Wordmark'

const initialState = { error: null }

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action] = useFormState(acceptInvite, initialState)

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">Set up your account</p>
        </div>

        <form action={action} className="bg-white rounded-10 border border-warm-300 p-6 space-y-4">
          {state.error && (
            <div className="bg-red-50 border border-red-200 rounded-7 px-3 py-2 text-ui text-red-700">
              {state.error}
            </div>
          )}

          <input type="hidden" name="token" value={token} />

          <div>
            <label htmlFor="firstName" className="block text-label font-medium text-warm-800 mb-1">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="Kwame"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-label font-medium text-warm-800 mb-1">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="Asante"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-label font-medium text-warm-800 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-label font-medium text-warm-800 mb-1">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <SubmitButton />
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
      {pending ? 'Setting up…' : 'Set up account'}
    </button>
  )
}
