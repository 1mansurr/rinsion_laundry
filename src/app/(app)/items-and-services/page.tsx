import { getMyProfile } from '@/services/employees/getMyProfile'
import { getItemTypes } from '@/services/items'
import { getServices } from '@/services/services'
import { getPricingMatrix } from '@/services/pricing'
import { ItemsServicesClient } from './ItemsServicesClient'
import { redirect } from 'next/navigation'

export default async function ItemsAndServicesPage() {
  const profile = await getMyProfile()
  if (!profile) return null
  if (profile.role !== 'admin') redirect('/dashboard')

  const [itemTypes, services, prices] = await Promise.all([
    getItemTypes(profile.laundryId),
    getServices(profile.laundryId),
    getPricingMatrix(profile.laundryId),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Items & Services</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure what you clean and at what price</p>
      </div>
      <ItemsServicesClient itemTypes={itemTypes} services={services} prices={prices} />
    </div>
  )
}
