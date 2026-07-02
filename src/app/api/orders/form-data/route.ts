import { NextResponse } from 'next/server'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getItemTypes } from '@/services/items'
import { getServices } from '@/services/services'
import { getPricingMatrix } from '@/services/pricing'
import { getCustomers, getCustomer } from '@/services/customers'
import { getSettings } from '@/services/settings'
import { createClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const profile = await getMyProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId') ?? undefined

  const supabase = createClient()

  const [itemTypes, services, prices, customers, branchesRes, settings] = await Promise.all([
    getItemTypes(profile.laundryId),
    getServices(profile.laundryId),
    getPricingMatrix(profile.laundryId),
    getCustomers(profile.laundryId),
    supabase.from('branches').select('id, name').eq('laundry_id', profile.laundryId).order('name'),
    getSettings(),
  ])

  const branches = (branchesRes.data ?? []).map(b => ({ id: b.id, name: b.name }))

  let preselectedCustomer: {
    id: string
    customerCode: string
    firstName: string
    lastName: string
    phone: string
    lastVisitDate: string | null
    createdAt: string
  } | null = null

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

  return NextResponse.json({
    itemTypes,
    services,
    prices,
    customers,
    branches,
    settings,
    preselectedCustomer,
    isAdmin: profile.role === 'admin',
    defaultBranchId: profile.branchId,
  })
}
