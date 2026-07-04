import { redirect } from 'next/navigation'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getItemTypes } from '@/services/items'
import { getServices } from '@/services/services'
import { getPricingMatrix } from '@/services/pricing'
import { getCustomers, getCustomer, type Customer } from '@/services/customers'
import { getSettings } from '@/services/settings'
import { createClient } from '@/lib/supabase'
import { CreateOrderForm } from './CreateOrderForm'

interface Props {
  searchParams: { customerId?: string }
}

export default async function NewOrderPage({ searchParams }: Props) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()
  const customerId = searchParams.customerId

  const [itemTypes, services, prices, customers, branchesRes, settings] = await Promise.all([
    getItemTypes(profile.laundryId),
    getServices(profile.laundryId),
    getPricingMatrix(profile.laundryId),
    getCustomers(profile.laundryId),
    supabase.from('branches').select('id, name').eq('laundry_id', profile.laundryId).order('name'),
    getSettings(),
  ])

  const branches = (branchesRes.data ?? []).map(b => ({ id: b.id, name: b.name }))

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

  const isMultiBranch = branches.length > 1
  const hasSetup = itemTypes.some(i => i.isActive) && services.some(s => s.isActive)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">New Order</h1>
      {!hasSetup ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-sm text-yellow-800 font-medium">Set up items &amp; services first</p>
          <p className="text-sm text-yellow-700 mt-1">You need at least one active item type, one active service, and a price set before creating orders.</p>
          <a href="/items-and-services" className="mt-4 inline-block px-4 py-2 bg-yellow-800 text-white text-sm rounded-lg hover:bg-yellow-900 transition-colors">Go to Items &amp; Services →</a>
        </div>
      ) : (
        <CreateOrderForm
          itemTypes={itemTypes}
          services={services}
          prices={prices}
          customers={customers}
          branches={branches}
          isAdmin={profile.role === 'admin'}
          defaultBranchId={profile.branchId}
          preselectedCustomer={preselectedCustomer}
          allowExpressOrders={settings?.allowExpressOrders ?? true}
          isMultiBranch={isMultiBranch}
          pricingModel={settings?.pricingModel ?? 'per_item'}
        />
      )}
    </div>
  )
}
