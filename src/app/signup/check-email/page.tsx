import Link from 'next/link'
import { Wordmark } from '@/components/ui/Wordmark'

export default function CheckEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-2">
          <Wordmark size="md" />
        </div>
        <div className="bg-white rounded-10 border border-warm-300 p-6 mt-6 space-y-3">
          <p className="text-ui font-semibold text-warm-950">Check your email</p>
          <p className="text-body text-warm-600">
            We&apos;ve sent a confirmation link to your email address. Click it, then come back and sign in.
          </p>
          <Link
            href="/login"
            className="inline-block mt-2 text-caption text-brand hover:text-brand-hover underline underline-offset-2"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
