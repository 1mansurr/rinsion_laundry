'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createCustomer } from '@/services/customers/createCustomer'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'

const initialState = { error: null as string | null, customerId: null as string | null }

async function createCustomerAction(
  _prev: typeof initialState,
  formData: FormData
): Promise<typeof initialState> {
  const result = await createCustomer({
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
    phone: formData.get('phone') as string,
  })
  if (result.success) return { error: null, customerId: result.data.id }
  return { error: result.error, customerId: null }
}

export default function NewCustomerPage() {
  const router = useRouter()
  const [state, action] = useFormState(createCustomerAction, initialState)

  useEffect(() => {
    if (state.customerId) router.push(`/customers/${state.customerId}`)
  }, [state.customerId, router])

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-warm-950 mb-6">New Customer</h1>

      <Card>
        <form action={action} className="space-y-4">
          {state.error && <Banner variant="destructive">{state.error}</Banner>}

          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" name="firstName" placeholder="Kwame" required />
            <Input label="Last Name" name="lastName" placeholder="Asante" required />
          </div>
          <Input label="Phone Number" name="phone" placeholder="024 123 4567" required />

          <div className="flex gap-3 pt-2">
            <SubmitButton />
            <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-xs text-warm-600 mt-3 text-center">
        If this phone number already exists, the existing customer will be returned.
      </p>
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" isPending={pending} className="flex-1">
      Save Customer
    </Button>
  )
}
