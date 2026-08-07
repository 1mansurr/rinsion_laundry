'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createPaymentLink } from '@/services/payments/createPaymentLink'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/formatCurrency'
import type { MobileMoneyProvider } from '@/lib/payments'

const PROVIDERS: { value: MobileMoneyProvider; label: string }[] = [
  { value: 'mtn', label: 'MTN Mobile Money' },
  { value: 'vod', label: 'Telecel Cash' },
  { value: 'tgo', label: 'AirtelTigo Money' },
]

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 2 * 60 * 1000

interface Props {
  orderId: string
  balance: number
  defaultPhone: string
  onPaid: () => void
}

/** Shared by OrderDetail.tsx and DashboardClient.tsx's Record Payment sheets. */
export function OrderPaystackPayButton({ orderId, balance, defaultPhone, onPaid }: Props) {
  const [phone, setPhone] = useState(defaultPhone)
  const [provider, setProvider] = useState<MobileMoneyProvider>('mtn')
  const [isPending, startTransition] = useTransition()
  const [isRedirecting, startRedirectTransition] = useTransition()
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
        setError('This is taking longer than expected. If the customer completed the PIN prompt, refresh in a moment.')
        return
      }
      try {
        const res = await fetch(`/api/payments/order-status?reference=${encodeURIComponent(reference!)}`)
        const json = await res.json()
        if (json.status === 'paid') {
          onPaid()
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
  }, [status, onPaid])

  function handlePay() {
    setError(null)
    startTransition(async () => {
      const res = await createPaymentLink({ orderId, channel: 'mobile_money', phone, provider })
      if (!res.success) {
        setError(res.error)
        return
      }
      referenceRef.current = res.data.referenceCode
      setDisplayText(res.data.displayText ?? null)
      setStatus('awaiting')
    })
  }

  function handleCardOrBank() {
    setError(null)
    startRedirectTransition(async () => {
      const res = await createPaymentLink({ orderId, channel: 'card' })
      if (!res.success) {
        setError(res.error)
        return
      }
      if (res.data.authorizationUrl) window.location.href = res.data.authorizationUrl
    })
  }

  if (status === 'awaiting') {
    return (
      <div className="bg-[#FAF8F5] rounded-10 px-4 py-3.5 text-center">
        <p className="text-ui-sm font-semibold text-warm-950 mb-1">
          {displayText ?? "Check the customer's phone to enter their PIN"}
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
        Pay {formatCurrency(balance)} via Mobile Money
      </Button>
      <button
        type="button"
        onClick={handleCardOrBank}
        disabled={isRedirecting}
        className="w-full text-center text-caption text-warm-600 hover:text-warm-900 underline disabled:opacity-60"
      >
        Pay by card or bank instead
      </button>
    </div>
  )
}
