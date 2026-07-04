import { redirect } from 'next/navigation'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getDashboardData } from '@/services/dashboard/getDashboardData'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const data = await getDashboardData(profile.laundryId, profile.role, profile.branchId)
  if (data.needsOnboarding) redirect('/onboarding')

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
