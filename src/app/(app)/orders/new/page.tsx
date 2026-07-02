'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { CreateOrderForm } from './CreateOrderForm'

function NewOrderContent() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId') ?? undefined
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (customerId) params.set('customerId', customerId)
    fetch(`/api/orders/form-data?${params}`)
      .then(r => r.json())
      .then(setData)
  }, [customerId])

  if (!data) return <PageSkeleton rows={3} />

  const hasSetup = data.itemTypes.some((i: any) => i.isActive) && data.services.some((s: any) => s.isActive)

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
          itemTypes={data.itemTypes}
          services={data.services}
          prices={data.prices}
          customers={data.customers}
          branches={data.branches}
          isAdmin={data.isAdmin}
          defaultBranchId={data.defaultBranchId}
          preselectedCustomer={data.preselectedCustomer}
          allowExpressOrders={data.settings?.allowExpressOrders ?? true}
        />
      )}
    </div>
  )
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <NewOrderContent />
    </Suspense>
  )
}
