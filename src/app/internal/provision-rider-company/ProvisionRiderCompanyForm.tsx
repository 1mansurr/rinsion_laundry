'use client'

import { useState, useTransition } from 'react'
import { provisionRiderCompany } from '@/services/platform/provisionRiderCompany'

export function ProvisionRiderCompanyForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [result, setResult] = useState<{ inviteLink: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  function handleSubmit() {
    if (!name.trim() || !companyPhone.trim() || !adminPhone.trim()) {
      setError('All fields are required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await provisionRiderCompany({
        name: name.trim(),
        companyPhone: companyPhone.trim(),
        adminPhone: adminPhone.trim(),
      })
      if (!res.success) { setError(res.error); return }
      setResult(res.data)
    })
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="bg-brand-pale border border-brand/30 rounded-12 px-4 py-3 text-ui text-warm-800">
          Rider company created.
        </div>
        {result.inviteLink ? (
          <div>
            <label className="block text-label font-medium text-warm-700 mb-1">
              Invite link — forward this to the admin yourself (no SMS is sent)
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={result.inviteLink}
                className="flex-1 border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 bg-warm-50"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(result.inviteLink!)
                  setCopied(true)
                }}
                className="border border-warm-300 rounded-12 px-4 py-2 text-ui font-medium text-warm-800 bg-white hover:bg-warm-100 transition-colors"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-ui text-warm-700">
            That phone number already has a Rinsion account — it&apos;s been linked directly as the admin, no invite needed.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-12 px-4 py-3 text-ui text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-label font-medium text-warm-700 mb-1">Rider company name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Speedy Riders"
          className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-label font-medium text-warm-700 mb-1">Company phone</label>
        <input
          value={companyPhone}
          onChange={e => setCompanyPhone(e.target.value)}
          placeholder="024 123 4567"
          className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-label font-medium text-warm-700 mb-1">First admin&apos;s phone</label>
        <input
          value={adminPhone}
          onChange={e => setAdminPhone(e.target.value)}
          placeholder="024 765 4321"
          className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="bg-brand text-[#FAF8F5] px-5 py-2.5 rounded-12 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Provisioning…' : 'Provision Rider Company'}
      </button>
    </div>
  )
}
