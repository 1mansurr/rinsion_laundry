import { redirect } from 'next/navigation'
import { getMyCustomerProfile } from '@/services/customerAuth/getMyCustomerProfile'
import { getPublicLaundryDirectory } from '@/services/laundries/getPublicLaundryDirectory'
import { Wordmark } from '@/components/ui/Wordmark'
import { DirectorySearch } from './DirectorySearch'

export default async function PortalDirectoryPage() {
  const profile = await getMyCustomerProfile()
  if (!profile) redirect(`/portal/login?redirect=${encodeURIComponent('/portal/directory')}`)

  const laundries = await getPublicLaundryDirectory()

  return (
    <main className="min-h-screen bg-canvas px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">Find a laundry</p>
        </div>
        <DirectorySearch laundries={laundries} />
      </div>
    </main>
  )
}
