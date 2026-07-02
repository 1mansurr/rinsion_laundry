'use client'

import { useProfile } from '@/contexts/ProfileContext'
import { PickupFlow } from './PickupFlow'

export default function PickupPage() {
  const profile = useProfile()
  if (!profile) return null

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Pickup Verification</h1>
        <p className="text-sm text-gray-500 mt-0.5">Search an order and verify the customer&apos;s pickup code</p>
      </div>
      <PickupFlow />
    </div>
  )
}
