import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyCustomerProfile } from '@/services/customerAuth/getMyCustomerProfile'
import { getMyLinkedLaundries } from '@/services/customerAuth/getMyLinkedLaundries'
import { Wordmark } from '@/components/ui/Wordmark'

export default async function PortalHomePage() {
  const profile = await getMyCustomerProfile()
  if (!profile) redirect('/portal/login')

  const laundries = await getMyLinkedLaundries()

  return (
    <main className="min-h-screen bg-canvas px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">
            {profile.firstName ? `Welcome back, ${profile.firstName}` : 'Welcome back'}
          </p>
        </div>

        <div className="bg-white rounded-18 border border-warm-300 p-6 space-y-4">
          <h1 className="text-ui font-semibold text-warm-950">Your laundries</h1>

          {laundries.length === 0 ? (
            <p className="text-body text-warm-600">
              You haven&apos;t placed an order with any laundry yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {laundries.map((l, i) => (
                <li key={l.id}>
                  {l.publicSlug ? (
                    <Link
                      href={`/portal/o/${l.publicSlug}`}
                      className="flex items-center justify-between border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 hover:border-brand transition-colors"
                    >
                      {l.name}
                      {i === 0 && (
                        <span className="text-caption text-brand font-medium">Last used</span>
                      )}
                    </Link>
                  ) : (
                    <span className="block border border-warm-200 rounded-12 px-3 py-2 text-ui text-warm-500">
                      {l.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/portal/directory"
            className="block text-center text-caption text-warm-500 hover:text-warm-800 transition-colors"
          >
            Browse all laundries
          </Link>
        </div>
      </div>
    </main>
  )
}
