import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getDeletedCustomers } from '@/services/customers/getDeletedCustomers'
import { getDeletedOrders } from '@/services/orders/getDeletedOrders'
import { getDeletedItemTypes } from '@/services/items/getDeletedItemTypes'
import { getDeletedServices } from '@/services/services/getDeletedServices'
import { getDeletedEmployees } from '@/services/employees/getDeletedEmployees'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { RecycleBinClient } from './RecycleBinClient'

export default async function RecycleBinPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-4 md:p-6">
        <div className="flex items-center gap-1.5 mb-6 text-caption">
          <Link href="/settings" className="text-warm-600 font-semibold hover:text-warm-900">Settings</Link>
          <span className="text-warm-400">/</span>
          <span className="text-warm-950 font-bold">Recycle Bin</span>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  const [customers, orders, itemTypes, services, employees] = await Promise.all([
    getDeletedCustomers(profile.laundryId),
    getDeletedOrders(profile.laundryId),
    getDeletedItemTypes(profile.laundryId),
    getDeletedServices(profile.laundryId),
    getDeletedEmployees(profile.laundryId),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 md:p-6">
      <div className="flex items-center gap-1.5 mb-5 md:mb-6 text-caption">
        <Link href="/settings" className="text-warm-600 font-semibold hover:text-warm-900">Settings</Link>
        <span className="text-warm-400">/</span>
        <span className="text-warm-950 font-bold">Recycle Bin</span>
      </div>

      <RecycleBinClient customers={customers} orders={orders} itemTypes={itemTypes} services={services} employees={employees} />
    </div>
  )
}
