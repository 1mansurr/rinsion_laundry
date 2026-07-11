import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const platformAdminId = await requirePlatformAdmin()
  if (!platformAdminId) redirect('/login')

  return (
    <div className="min-h-screen bg-canvas">
      <nav className="border-b border-warm-300 bg-white px-6 py-3">
        <span className="text-ui font-semibold text-warm-950">Rinsion Platform</span>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
