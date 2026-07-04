import { requireSignupInProgress } from '@/services/laundries/getSignupStatus'
import { JoinLaundryForm } from './JoinLaundryForm'

export default async function JoinLaundryPage() {
  await requireSignupInProgress()

  return <JoinLaundryForm />
}
