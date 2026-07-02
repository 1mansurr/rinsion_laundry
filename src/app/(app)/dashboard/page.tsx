'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { CardSkeleton } from '@/components/ui/PageSkeleton'
import { DashboardClient } from './DashboardClient'
import type { ReadyOrder, ActivityEntry } from './DashboardClient'
import type { SubscriptionStatus } from '@/constants/subscriptionStatuses'

interface DashboardData {
  readyOrders: ReadyOrder[]
  isFirstTime: boolean
  adminStats?: { ordersToday: number; outstandingBalance: number; activeCustomersThisWeek: number }
  activities: ActivityEntry[]
  showSmsBanner: boolean
  smsUsed: number
  smsQuota: number
  subscriptionStatus: SubscriptionStatus | null
  todayDate: string
  redirect?: string
}

export default function DashboardPage() {
  const profile = useProfile()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then((d: DashboardData) => {
        if (d.redirect) {
          router.replace(d.redirect)
        } else {
          setData(d)
        }
      })
  }, [router])

  if (!data || !profile) return <CardSkeleton />

  return (
    <DashboardClient
      profile={{
        firstName: profile.firstName,
        role: profile.role,
        branchId: profile.branchId,
        laundryName: profile.laundryName,
      }}
      readyOrders={data.readyOrders}
      isFirstTime={data.isFirstTime}
      adminStats={data.adminStats}
      activities={data.activities}
      showSmsBanner={data.showSmsBanner}
      smsUsed={data.smsUsed}
      smsQuota={data.smsQuota}
      subscriptionStatus={data.subscriptionStatus}
      todayDate={data.todayDate}
    />
  )
}
