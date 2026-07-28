'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCustomer } from '@/services/customers/updateCustomer'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'

interface Props {
  customerId: string
  firstName: string
  lastName: string
  phone: string
  location: string
}

export function EditCustomerForm({ customerId, firstName: initFirst, lastName: initLast, phone: initPhone, location: initLocation }: Props) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(initFirst)
  const [lastName, setLastName] = useState(initLast)
  const [phone, setPhone] = useState(initPhone)
  const [location, setLocation] = useState(initLocation)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const res = await updateCustomer({ id: customerId, firstName, lastName, phone, location })
      if (!res.success) { setError(res.error); return }
      router.push(`/customers/${customerId}`)
    })
  }

  return (
    <Card>
      <div className="space-y-4">
        {error && <Banner variant="destructive">{error}</Banner>}

        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
          <Input label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required />
        </div>
        <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} required />
        <Input
          label="Location (optional)"
          placeholder="e.g. Hall 7, KNUST"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button
            className="flex-1"
            isPending={isPending}
            disabled={isPending || !firstName.trim() || !phone.trim()}
            onClick={handleSubmit}
          >
            Save Changes
          </Button>
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  )
}
