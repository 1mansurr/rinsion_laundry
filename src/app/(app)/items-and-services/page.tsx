'use client'
import { useEffect, useState } from 'react'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { ItemsServicesClient } from './ItemsServicesClient'
import type { PriceCell } from '@/services/pricing'
import type { PricingModel, PricingMode } from '@/constants/statuses'

type ItemType = { id: string; name: string; isActive: boolean }
type Service = { id: string; name: string; isActive: boolean; pricingMode: PricingMode; kgRate: number | null }

type ItemsPageData = {
  restricted?: boolean
  itemTypes: ItemType[]
  services: Service[]
  prices: PriceCell[]
  pricingModel: PricingModel
}

export default function ItemsAndServicesPage() {
  const [data, setData] = useState<ItemsPageData | null>(null)

  useEffect(() => {
    fetch('/api/items-and-services').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <PageSkeleton />

  if (data.restricted) {
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

  return (
    <div className="max-w-[1180px] mx-auto px-7 py-7">
      <div className="mb-[18px]">
        <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight">Items &amp; Services</h1>
        <p className="text-ui text-warm-800 mt-1">The garment types and services your team picks from when creating orders.</p>
      </div>
      <ItemsServicesClient
        itemTypes={data.itemTypes}
        services={data.services}
        prices={data.prices}
        pricingModel={data.pricingModel}
      />
    </div>
  )
}
