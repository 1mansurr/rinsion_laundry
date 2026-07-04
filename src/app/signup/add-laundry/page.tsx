import { requireSignupInProgress } from '@/services/laundries/getSignupStatus'
import { AddLaundryForm } from './AddLaundryForm'

export default async function AddLaundryPage() {
  await requireSignupInProgress()

  return <AddLaundryForm />
}
