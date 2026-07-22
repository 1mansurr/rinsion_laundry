'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createCustomer } from '@/services/customers/createCustomer'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

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
      <h1 className="text-xl font-bold text-gray-900 mb-6">New Customer</h1>

      <form action={action} className="bg-white rounded-18 border border-gray-200 p-6 space-y-4">
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-10 px-3 py-2 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" name="firstName" placeholder="Kwame" required />
          <Field label="Last Name" name="lastName" placeholder="Asante" required />
        </div>
        <Field label="Phone Number" name="phone" placeholder="024 123 4567" required />

        <div className="flex gap-3 pt-2">
          <SubmitButton />
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-12 text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      <p className="text-xs text-gray-400 mt-3 text-center">
        If this phone number already exists, the existing customer will be returned.
      </p>
    </div>
  )
}

function Field({ label, name, placeholder, required }: {
  label: string; name: string; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        id={name} name={name} placeholder={placeholder} required={required}
        className="w-full border border-gray-300 rounded-12 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit" disabled={pending}
      className="flex-1 bg-gray-900 text-white py-2.5 rounded-12 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Saving…' : 'Save Customer'}
    </button>
  )
}
