'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { initiateSubscriptionPayment } from '@/services/subscriptions/initiateSubscriptionPayment'
import { Button } from '@/components/ui/Button'
import type { MobileMoneyProvider } from '@/lib/payments'

const PROVIDERS: { value: MobileMoneyProvider; label: string }[] = [
  { value: 'mtn', label: 'MTN Mobile Money' },
  { value: 'vod', label: 'Telecel Cash' },
  { value: 'tgo', label: 'AirtelTigo Money' },
]

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 2 * 60 * 1000

interface Props {
  paymentType: 'cycle_renewal' | 'trial_conversion'
  targetPlan: 'starter' | 'growth'
  amount: number
  defaultPhone: string
}

export function PaystackPayButton({ paymentType, targetPlan, amount, defaultPhone }: Props) {
  const [phone, setPhone] = useState(defaultPhone)
  const [provider, setProvider] = useState<MobileMoneyProvider>('mtn')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'awaiting' | 'failed'>('idle')
  const [displayText, setDisplayText] = useState<string | null>(null)
  const referenceRef = useRef<string | null>(null)

  useEffect(() => {
    if (status !== 'awaiting') return
    const reference = referenceRef.current
    if (!reference) return

    let cancelled = false
    const startedAt = Date.now()
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      if (cancelled) return
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setStatus('failed')
        setError('This is taking longer than expected. If you completed the PIN prompt, refresh the page in a moment.')
        return
      }
      try {
        const res = await fetch(`/api/payments/subscription-status?reference=${encodeURIComponent(reference!)}`)
        const json = await res.json()
        if (json.status === 'paid') {
          window.location.reload()
          return
        }
        if (json.status === 'failed' || json.status === 'expired') {
          setStatus('failed')
          setError('The payment was not completed.')
          return
        }
      } catch {
        // transient network error — keep polling
      }
      if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [status])

  function handlePay() {
    setError(null)
    startTransition(async () => {
      const res = await initiateSubscriptionPayment({ paymentType, targetPlan, phone, provider })
      if (!res.success) {
        setError(res.error)
        return
      }
      referenceRef.current = res.data.referenceCode
      setDisplayText(res.data.displayText ?? null)
      setStatus('awaiting')
    })
  }

  if (status === 'awaiting') {
    return (
      <div className="bg-[#FAF8F5] rounded-10 px-4 py-3.5 text-center">
        <p className="text-ui-sm font-semibold text-warm-950 mb-1">
          {displayText ?? 'Check your phone to enter your PIN'}
        </p>
        <p className="text-caption text-warm-500">Waiting for confirmation…</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {error && <p className="text-caption text-error-fg">{error}</p>}
      <div className="flex gap-2">
        <select
          value={provider}
          onChange={e => setProvider(e.target.value as MobileMoneyProvider)}
          className="border border-warm-300 rounded-10 px-3 py-2.5 text-ui-sm bg-white text-warm-950"
        >
          {PROVIDERS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="0XX XXX XXXX"
          className="flex-1 border border-warm-300 rounded-10 px-3 py-2.5 text-ui-sm"
        />
      </div>
      <Button onClick={handlePay} isPending={isPending} disabled={!phone} className="w-full min-h-[48px]">
        Pay GHS {amount} via Mobile Money
      </Button>
    </div>
  )
}
