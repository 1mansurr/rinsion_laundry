'use client'

import Link from 'next/link'
import { SignupGuard } from '../SignupGuard'
import { Wordmark } from '@/components/ui/Wordmark'

export default function ChoosePage() {
  return (
    <SignupGuard>
      <main className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-2">
              <Wordmark size="md" />
            </div>
            <p className="text-body text-warm-600">How would you like to get started?</p>
          </div>
          <div className="space-y-3">
            <Link
              href="/signup/add-laundry"
              className="block bg-white border border-warm-300 rounded-10 p-5 hover:border-brand transition-colors"
            >
              <p className="text-ui font-semibold text-warm-950">Add a laundry</p>
              <p className="text-caption text-warm-600 mt-1">Set up a new laundry business and become its admin.</p>
            </Link>
            <Link
              href="/signup/join-laundry"
              className="block bg-white border border-warm-300 rounded-10 p-5 hover:border-brand transition-colors"
            >
              <p className="text-ui font-semibold text-warm-950">Join a laundry</p>
              <p className="text-caption text-warm-600 mt-1">Enter a PIN from your laundry&apos;s admin to request access.</p>
            </Link>
          </div>
        </div>
      </main>
    </SignupGuard>
  )
}
