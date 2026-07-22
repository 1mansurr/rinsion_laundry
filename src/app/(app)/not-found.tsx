import Link from 'next/link'
import { OMark } from '@/components/ui/OMark'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
      <OMark size={48} variant="default" />
      <div>
        <h2 className="text-h2 font-semibold text-warm-950 mb-2">Page not found</h2>
        <p className="text-body text-warm-700 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center bg-brand text-[#FAF8F5] text-ui font-semibold px-4 py-2.5 rounded-12 hover:bg-brand-hover transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  )
}
