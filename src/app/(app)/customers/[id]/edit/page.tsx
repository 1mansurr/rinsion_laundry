import { redirect, notFound } from 'next/navigation'
import { getMyProfile } from '@/services/employees/getMyProfile'
import { getCustomer } from '@/services/customers/getCustomer'
import { EditCustomerForm } from './EditCustomerForm'

interface Props {
  params: { id: string }
}

export default async function EditCustomerPage({ params }: Props) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')

  const data = await getCustomer(params.id)
  if (!data) notFound()

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-warm-950 mb-6">Edit Customer</h1>
      <EditCustomerForm
        customerId={data.id}
        firstName={data.first_name}
        lastName={data.last_name}
        phone={data.phone}
        location={data.location ?? ''}
      />
    </div>
  )
}
