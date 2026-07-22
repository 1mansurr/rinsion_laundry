import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getItemTypes } from '@/services/items/getItemTypes'
import { getServices } from '@/services/services/getServices'
import { getPricingMatrix } from '@/services/pricing/getPricingMatrix'
import { getCustomers } from '@/services/customers/getCustomers'
import { getCustomer } from '@/services/customers/getCustomer'
import type { Customer } from '@/services/customers/getCustomers'
import { getSettings } from '@/services/settings/getSettings'
import { CreateOrderForm } from './CreateOrderForm'

interface Props {
  searchParams: { customerId?: string }
}

export default async function NewOrderPage({ searchParams }: Props) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const customerId = searchParams.customerId

  const [itemTypes, services, prices, customers, settings] = await Promise.all([
    getItemTypes(profile.laundryId),
    getServices(profile.laundryId),
    getPricingMatrix(profile.laundryId),
    getCustomers(profile.laundryId),
    getSettings(),
  ])

  let preselectedCustomer: Customer | null = null
  if (customerId) {
    const d = await getCustomer(customerId)
    if (d) {
      preselectedCustomer = {
        id: d.id,
        customerCode: d.customer_code,
        firstName: d.first_name,
        lastName: d.last_name,
        phone: d.phone,
        lastVisitDate: d.last_visit_date,
        createdAt: d.created_at,
      }
    }
  }

  const hasSetup = itemTypes.some(i => i.isActive) && services.some(s => s.isActive)

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:p-6">
      <div className="flex items-center gap-3 mb-5 md:mb-6">
        <Link
          href="/dashboard"
          aria-label="Back"
          className="md:hidden w-11 h-11 -ml-1.5 rounded-12 bg-warm-150 border border-warm-300 flex items-center justify-center shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#6B6259" aria-hidden>
            <path d="M15.4 5.6 8.99 12l6.41 6.4a1 1 0 0 1-1.42 1.42l-7.1-7.1a1 1 0 0 1 0-1.42l7.1-7.1a1 1 0 1 1 1.42 1.4Z" />
          </svg>
        </Link>
        <h1 className="text-h1 font-semibold text-warm-950">New order</h1>
      </div>
      {!hasSetup ? (
        <div className="bg-warning-bg border border-warning-border rounded-10 p-6 text-center">
          <p className="text-ui text-warning-fg font-medium">Set up items &amp; services first</p>
          <p className="text-caption text-warning-fg mt-1">You need at least one active item type, one active service, and a price set before creating orders.</p>
          <a href="/items-and-services" className="mt-4 inline-block px-4 py-2 bg-warning text-white text-ui rounded-12 hover:opacity-90 transition-opacity">Go to Items &amp; Services →</a>
        </div>
      ) : (
        <CreateOrderForm
          itemTypes={itemTypes}
          services={services}
          prices={prices}
          customers={customers}
          preselectedCustomer={preselectedCustomer}
          allowExpressOrders={settings?.allowExpressOrders ?? true}
        />
      )}
    </div>
  )
}
