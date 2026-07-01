import { getMyProfile } from '@/services/employees/getMyProfile'
import { getItemTypes } from '@/services/items'
import { getServices } from '@/services/services'
import { getPricingMatrix } from '@/services/pricing'
import { ItemsServicesClient } from './ItemsServicesClient'
import { RestrictedCard } from '@/components/app/RestrictedCard'

export default async function ItemsAndServicesPage() {
  const profile = await getMyProfile()
  if (!profile) return null

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-[1180px] mx-auto px-7 py-7">
        <div className="mb-[18px]">
          <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Items &amp; Services</h1>
          <p className="text-ui text-warm-800 mt-1">The garment types and services your team picks from when creating orders.</p>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  const [itemTypes, services, prices] = await Promise.all([
    getItemTypes(profile.laundryId),
    getServices(profile.laundryId),
    getPricingMatrix(profile.laundryId),
  ])

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      <div className="mb-[18px]">
        <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Items &amp; Services</h1>
        <p className="text-ui text-warm-800 mt-1">The garment types and services your team picks from when creating orders.</p>
      </div>
      <ItemsServicesClient itemTypes={itemTypes} services={services} prices={prices} />
    </div>
  )
}
