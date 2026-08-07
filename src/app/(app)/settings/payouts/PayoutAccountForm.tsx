'use client'

import { useState, useTransition } from 'react'
import { resolveAccountNumber } from '@/services/payouts/resolveAccountNumber'
import { createPayoutAccount } from '@/services/payouts/createPayoutAccount'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { PayoutAccount } from '@/services/payouts/getPayoutAccount'
import type { BankChoice } from '@/services/payouts/listGhanaBanks'

interface Props {
  existing: PayoutAccount | null
  banks: BankChoice[]
  defaultBusinessName: string
}

export function PayoutAccountForm({ existing, banks, defaultBusinessName }: Props) {
  if (existing?.status === 'active') {
    return (
      <div className="space-y-2">
        <div className="bg-[#FAF8F5] rounded-10 px-4 py-3.5 space-y-2">
          <div className="flex justify-between text-ui-sm">
            <span className="text-warm-600">Business name</span>
            <span className="font-semibold text-warm-950">{existing.businessName}</span>
          </div>
          <div className="flex justify-between text-ui-sm">
            <span className="text-warm-600">Bank / MoMo</span>
            <span className="font-semibold text-warm-950">{existing.settlementBankName}</span>
          </div>
          <div className="flex justify-between text-ui-sm">
            <span className="text-warm-600">Account</span>
            <span className="tnum font-semibold text-warm-950">•••• {existing.accountNumber.slice(-4)}</span>
          </div>
          {existing.accountName && (
            <div className="flex justify-between text-ui-sm">
              <span className="text-warm-600">Account name</span>
              <span className="font-semibold text-warm-950">{existing.accountName}</span>
            </div>
          )}
        </div>
        <p className="text-caption text-warm-500">To change these details, contact Rinsion directly.</p>
      </div>
    )
  }

  return <PayoutAccountSetupForm banks={banks} defaultBusinessName={defaultBusinessName} />
}

function PayoutAccountSetupForm({ banks, defaultBusinessName }: { banks: BankChoice[]; defaultBusinessName: string }) {
  const [businessName, setBusinessName] = useState(defaultBusinessName)
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [resolvedName, setResolvedName] = useState<string | null>(null)

  const [isVerifying, startVerify] = useTransition()
  const [isSaving, startSave] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const selectedBank = banks.find(b => b.code === bankCode)

  function handleVerify() {
    setError(null)
    setResolvedName(null)
    startVerify(async () => {
      const res = await resolveAccountNumber(accountNumber, bankCode)
      if (!res.success) {
        setError(res.error)
        return
      }
      setResolvedName(res.data.accountName)
    })
  }

  function handleSave() {
    setError(null)
    startSave(async () => {
      const res = await createPayoutAccount({
        businessName,
        settlementBankCode: bankCode,
        settlementBankName: selectedBank?.name ?? '',
        accountNumber,
        accountName: resolvedName ?? undefined,
      })
      if (!res.success) {
        setError(res.error)
        return
      }
      setSaved(true)
    })
  }

  if (saved) {
    return <p className="text-ui-sm text-success-fg font-semibold">Payout account saved.</p>
  }

  const canVerify = bankCode && accountNumber.length >= 6
  const canSave = bankCode && accountNumber.length >= 6 && businessName.trim()

  return (
    <div className="space-y-3.5">
      {error && <p className="text-caption text-error-fg">{error}</p>}

      <Input
        label="Business name"
        value={businessName}
        onChange={e => setBusinessName(e.target.value)}
      />

      <div>
        <label className="block text-label font-medium text-warm-950 mb-[7px]">Bank / Mobile Money</label>
        <select
          value={bankCode}
          onChange={e => { setBankCode(e.target.value); setResolvedName(null) }}
          className="w-full font-sans text-ui px-[13px] py-[11px] border border-warm-400 rounded-12 bg-white text-warm-950"
        >
          <option value="">Select…</option>
          <optgroup label="Mobile Money">
            {banks.filter(b => b.isMobileMoney).map(b => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </optgroup>
          <optgroup label="Banks">
            {banks.filter(b => !b.isMobileMoney).map(b => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <Input
        label="Account number"
        value={accountNumber}
        onChange={e => { setAccountNumber(e.target.value); setResolvedName(null) }}
        placeholder="0XX XXX XXXX"
      />

      {resolvedName ? (
        <div className="bg-success-bg border border-success-border rounded-10 px-4 py-3 text-ui-sm text-success-fg">
          Verified: {resolvedName}
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={handleVerify} isPending={isVerifying} disabled={!canVerify}>
          Verify account
        </Button>
      )}

      <Button onClick={handleSave} isPending={isSaving} disabled={!canSave} className="w-full min-h-[48px]">
        Save payout account
      </Button>
    </div>
  )
}
