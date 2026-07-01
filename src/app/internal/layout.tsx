import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isInternalAdmin } from '@/services/admin/isInternalAdmin'
import { InternalNav } from './InternalNav'

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const adminEmail = await isInternalAdmin()
  if (!adminEmail) notFound()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-52 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-900 tracking-tight">Rinsion Internal</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{adminEmail}</p>
        </div>
        <div className="flex-1 py-3">
          <InternalNav />
        </div>
        <div className="px-4 py-4 border-t border-gray-100">
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
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
