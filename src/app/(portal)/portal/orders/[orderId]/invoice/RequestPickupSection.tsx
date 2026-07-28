'use client'

import { useState, useTransition } from 'react'
import { requestPickup } from '@/services/pickupRequests/requestPickup'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface Props {
  orderId: string
  /** Pre-filled from orders.location, itself snapshotted from customers.location at order creation. */
  initialLocation: string | null
}

/**
 * "Request Pickup" (docs/customer-portal+rider.md §3). The pickup address IS
 * orders.location, not a field of its own — product decision 2026-07-28:
 * customers.location and orders.location "should be the same unless the
 * customer edits it," and an edit should prompt "just for this order" vs
 * "my location has changed" (which also updates the saved default).
 *
 * That choice is only ambiguous when there WAS a prior default to preserve —
 * if the customer never had one (initialLocation null), whatever they type
 * now becomes their default with no prompt; there's nothing to distinguish
 * it from.
 */
export function RequestPickupSection({ orderId, initialLocation }: Props) {
  const [location, setLocation] = useState(initialLocation ?? '')
  const [editing, setEditing] = useState(!initialLocation)
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScopeModal, setShowScopeModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (submitted) {
    return (
      <div className="border-t border-warm-200 pt-4 text-center">
        <p className="text-ui font-medium text-warm-950">Pickup requested</p>
        <p className="text-caption text-warm-600 mt-1">The laundry will review and confirm shortly.</p>
      </div>
    )
  }

  function submit(updateCustomerDefault: boolean) {
    setError(null)
    setShowScopeModal(false)
    const locationChanged = location.trim() !== (initialLocation ?? '').trim()
    startTransition(async () => {
      const res = await requestPickup({
        orderId,
        location: locationChanged ? location.trim() : undefined,
        updateCustomerDefault,
        notes: notes || undefined,
      })
      if (!res.success) { setError(res.error); return }
      setSubmitted(true)
    })
  }

  function handleSubmit() {
    if (!location.trim()) { setError('Enter a pickup address.'); return }
    setError(null)

    const locationChanged = location.trim() !== (initialLocation ?? '').trim()

    // Only ambiguous when there was a prior default to preserve or overwrite —
    // a first-time location just becomes the default, no prompt needed.
    if (locationChanged && initialLocation) {
      setShowScopeModal(true)
      return
    }

    submit(/* updateCustomerDefault */ locationChanged)
  }

  return (
    <div className="border-t border-warm-200 pt-4 space-y-3 print:hidden">
      <p className="text-label font-medium text-warm-800">Request pickup</p>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-12 px-3 py-2 text-ui text-red-700">{error}</div>
      )}

      {editing ? (
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Hostel / hall, room number"
          className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          autoFocus
        />
      ) : (
        <div className="flex items-center justify-between bg-warm-50 border border-warm-200 rounded-12 px-3 py-2">
          <span className="text-ui text-warm-950">{location}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-caption text-brand hover:text-brand-hover underline underline-offset-2 shrink-0 ml-3"
          >
            Change
          </button>
        </div>
      )}

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes for the rider (optional)"
        rows={2}
        className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full bg-brand text-[#FAF8F5] py-2.5 px-4 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Requesting…' : 'Request pickup'}
      </button>

      <Modal
        open={showScopeModal}
        onClose={() => setShowScopeModal(false)}
        title="Update your pickup location?"
        description="You changed the pickup address for this order."
      >
        <div className="flex flex-col gap-2.5">
          <Button variant="secondary" isPending={isPending} disabled={isPending} onClick={() => submit(false)}>
            Just for this pickup
          </Button>
          <Button variant="primary" isPending={isPending} disabled={isPending} onClick={() => submit(true)}>
            My location has changed — update my default
          </Button>
        </div>
      </Modal>
    </div>
  )
}
