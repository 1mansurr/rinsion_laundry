import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getPayoutAccount } from '@/services/payouts/getPayoutAccount'
import { listGhanaBanks } from '@/services/payouts/listGhanaBanks'
import { RestrictedCard } from '@/components/app/RestrictedCard'
import { PayoutAccountForm } from './PayoutAccountForm'

export default async function PayoutsPage() {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 md:p-6">
        <div className="flex items-center gap-1.5 mb-6 text-caption">
          <Link href="/settings" className="text-warm-600 font-semibold hover:text-warm-900">Settings</Link>
          <span className="text-warm-400">/</span>
          <span className="text-warm-950 font-bold">Payouts</span>
        </div>
        <RestrictedCard />
      </div>
    )
  }

  const [payoutAccount, banks] = await Promise.all([
    getPayoutAccount(),
    listGhanaBanks(),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:p-6">
      <div className="flex items-center gap-1.5 mb-5 md:mb-6 text-caption">
        <Link href="/settings" className="text-warm-600 font-semibold hover:text-warm-900">Settings</Link>
        <span className="text-warm-400">/</span>
        <span className="text-warm-950 font-bold">Payouts</span>
      </div>

      <div className="bg-white border border-warm-300 rounded-18 p-5">
        <p className="text-ui font-semibold text-warm-950 mb-1">
          {payoutAccount?.status === 'active' ? 'Payout account' : 'Set up payouts'}
        </p>
        <p className="text-caption text-warm-600 mb-4">
          Customer order payments settle directly into this account — Rinsion never holds the money.
        </p>
        <PayoutAccountForm existing={payoutAccount} banks={banks} defaultBusinessName={profile.laundryName} />
      </div>
    </div>
  )
}
