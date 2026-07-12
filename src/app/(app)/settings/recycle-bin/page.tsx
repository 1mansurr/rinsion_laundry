import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getDeletedCustomers } from '@/services/customers/getDeletedCustomers'
import { getDeletedOrders } from '@/services/orders/getDeletedOrders'
import { getDeletedItemTypes } from '@/services/items/getDeletedItemTypes'
import { getDeletedServices } from '@/services/services/getDeletedServices'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { RecycleBinClient } from './RecycleBinClient'

export default async function RecycleBinPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">Settings</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-semibold text-gray-900">Recycle Bin</h1>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  const [customers, orders, itemTypes, services] = await Promise.all([
    getDeletedCustomers(profile.laundryId),
    getDeletedOrders(profile.laundryId),
    getDeletedItemTypes(profile.laundryId),
    getDeletedServices(profile.laundryId),
  ])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-700">Settings</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-semibold text-gray-900">Recycle Bin</h1>
      </div>

      <RecycleBinClient customers={customers} orders={orders} itemTypes={itemTypes} services={services} />
    </div>
  )
}
