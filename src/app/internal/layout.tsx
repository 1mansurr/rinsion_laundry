import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { InternalNav } from './InternalNav'
import { Wordmark } from '@/components/ui/Wordmark'

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const platformAdminId = await requirePlatformAdmin()
  // Not a 404 — this is a real page a non-platform-admin just isn't allowed
  // into. Send them back to the app with a dismissable notice instead.
  if (!platformAdminId) redirect('/dashboard?error=unauthorized')

  const { data: { user } } = await createClient().auth.getUser()
  const adminLabel = user?.email ?? user?.phone ?? 'Platform admin'

  return (
    <div className="min-h-screen bg-canvas flex">
      <aside className="w-52 bg-white border-r border-warm-200 flex-shrink-0 flex flex-col">
        <div className="px-4 py-5 border-b border-warm-100">
          <div className="flex items-center gap-2">
            <Wordmark size="sm" />
            <span className="text-caption font-semibold text-warm-700">Internal</span>
          </div>
          <p className="text-micro text-warm-500 mt-0.5 truncate">{adminLabel}</p>
        </div>
        <div className="flex-1 py-3">
          <InternalNav />
        </div>
        <div className="px-4 py-4 border-t border-warm-100">
          <Link href="/dashboard" className="text-caption text-warm-500 hover:text-warm-800 transition-colors">
            ← Back to app
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
