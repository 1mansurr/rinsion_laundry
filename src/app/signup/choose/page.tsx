import Link from 'next/link'
import { requireSignupInProgress } from '@/services/laundries/getSignupStatus'
import { Wordmark } from '@/components/ui/Wordmark'
import { SignOutButton } from '@/components/ui/SignOutButton'

export default async function ChoosePage() {
  await requireSignupInProgress()

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">How would you like to get started?</p>
          <p className="text-caption text-warm-500 mt-2">
            Wrong account?{' '}
            <SignOutButton className="text-brand hover:text-brand-hover underline underline-offset-2" />
          </p>
        </div>
        <div className="space-y-3">
          <Link
            href="/signup/add-laundry"
            className="block bg-white border border-warm-300 rounded-18 p-5 hover:border-brand transition-colors"
          >
            <p className="text-ui font-semibold text-warm-950">Add a laundry</p>
            <p className="text-caption text-warm-600 mt-1">Set up a new laundry business and become its admin.</p>
          </Link>
          <Link
            href="/signup/join-laundry"
            className="block bg-white border border-warm-300 rounded-18 p-5 hover:border-brand transition-colors"
          >
            <p className="text-ui font-semibold text-warm-950">Join a laundry</p>
            <p className="text-caption text-warm-600 mt-1">Enter a PIN from your laundry&apos;s admin to request access.</p>
          </Link>
        </div>
      </div>
    </main>
  )
}
