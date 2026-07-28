import { redirect } from 'next/navigation'
import { getMyCustomerProfile } from '@/services/customerAuth/getMyCustomerProfile'
import { getLaundryByPublicSlug } from '@/services/laundries/getLaundryByPublicSlug'
import { getItemTypes } from '@/services/items/getItemTypes'
import { getServices } from '@/services/services/getServices'
import { getPricingMatrix } from '@/services/pricing/getPricingMatrix'
import { NewCustomerOrderForm } from './NewCustomerOrderForm'
import { Wordmark } from '@/components/ui/Wordmark'

export default async function LaundryPortalPage({ params }: { params: { slug: string } }) {
  const profile = await getMyCustomerProfile()
  if (!profile) redirect(`/portal/login?redirect=${encodeURIComponent(`/portal/o/${params.slug}`)}`)

  const laundry = await getLaundryByPublicSlug(params.slug)

  if (!laundry || !laundry.allowCustomerSubmissions) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <Wordmark size="md" />
          </div>
          <p className="text-body text-warm-600">This laundry isn&apos;t accepting online orders right now.</p>
        </div>
      </main>
    )
  }

  const [itemTypes, services, prices] = await Promise.all([
    getItemTypes(laundry.id),
    getServices(laundry.id),
    getPricingMatrix(laundry.id),
  ])

  return (
    <main className="min-h-screen bg-canvas px-4 py-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-h1 font-semibold text-warm-950">{laundry.name}</h1>
          <p className="text-body text-warm-600">Create a new order</p>
        </div>
        <NewCustomerOrderForm laundryId={laundry.id} itemTypes={itemTypes} services={services} prices={prices} />
      </div>
    </main>
  )
}
