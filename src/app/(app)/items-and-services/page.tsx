import { redirect } from 'next/navigation'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getItemTypes } from '@/services/items'
import { getServices } from '@/services/services'
import { getPricingMatrix } from '@/services/pricing'
import { getSettings } from '@/services/settings'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { ItemsServicesClient } from './ItemsServicesClient'

export default async function ItemsAndServicesPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

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

  const [itemTypes, services, prices, settings] = await Promise.all([
    getItemTypes(profile.laundryId),
    getServices(profile.laundryId),
    getPricingMatrix(profile.laundryId),
    getSettings(),
  ])

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      <div className="mb-[18px]">
        <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Items &amp; Services</h1>
        <p className="text-ui text-warm-800 mt-1">The garment types and services your team picks from when creating orders.</p>
      </div>
      <ItemsServicesClient
        itemTypes={itemTypes}
        services={services}
        prices={prices}
        pricingModel={settings?.pricingModel ?? 'per_item'}
      />
    </div>
  )
}
