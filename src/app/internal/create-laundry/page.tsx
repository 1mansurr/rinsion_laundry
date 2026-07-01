'use client'

import { useState, useTransition } from 'react'
import { createLaundry } from '@/services/admin/createLaundry'
import type { CreateLaundryData } from '@/services/admin/createLaundry'

export default function CreateLaundryPage() {
  const [result, setResult] = useState<
    | { ok: true; data: CreateLaundryData; ownerEmail: string }
    | { ok: false; error: string }
    | null
  >(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await createLaundry({
        laundryName: fd.get('laundryName') as string,
        laundryCode: (fd.get('laundryCode') as string).toUpperCase().trim(),
        branchName: fd.get('branchName') as string,
        ownerFirstName: fd.get('ownerFirstName') as string,
        ownerLastName: fd.get('ownerLastName') as string,
        ownerEmail: fd.get('ownerEmail') as string,
        ownerPhone: fd.get('ownerPhone') as string,
      })

      if (res.success) {
        setResult({ ok: true, data: res.data, ownerEmail: fd.get('ownerEmail') as string })
      } else {
        setResult({ ok: false, error: res.error })
      }
    })
  }

  if (result?.ok) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-10 p-6">
          <p className="text-ui font-semibold text-green-800 mb-1">Laundry provisioned</p>
          <p className="text-caption text-green-600 mb-4">
            14-day trial started automatically. Share these credentials with the owner.
          </p>
          <div className="bg-white rounded-7 border border-green-200 p-4 space-y-1 font-mono text-ui text-warm-950">
            <p><span className="text-warm-500">Email:</span> {result.ownerEmail}</p>
            <p><span className="text-warm-500">Password:</span> <strong>{result.data.tempPassword}</strong></p>
          </div>
          <p className="text-caption text-green-600 mt-3">
            Owner must change password after first login.
          </p>
          <button
            onClick={() => setResult(null)}
            className="mt-5 text-caption text-green-700 underline underline-offset-2"
          >
            Provision another laundry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-h2 font-semibold text-warm-950 mb-1">Provision New Laundry</h1>
      <p className="text-ui text-warm-600 mb-8">
        Internal admin only · Creates laundry + branch + owner + 14-day trial
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-10 border border-warm-200 p-6 space-y-6">
        {result?.ok === false && (
          <div className="bg-red-50 border border-red-200 rounded-7 px-3 py-2 text-ui text-red-700">
            {result.error}
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-caption font-semibold text-warm-600 uppercase tracking-wider">
            Laundry
          </h2>
          <Field label="Laundry Name" name="laundryName" placeholder="Bright Clean Laundry" required />
          <Field
            label="Laundry Code"
            name="laundryCode"
            placeholder="BRIGHTCLEAN"
            required
            hint="Unique identifier — uppercase letters and numbers only"
          />
          <Field
            label="Branch Location (optional)"
            name="branchName"
            placeholder="e.g. Kumasi, Adum"
            defaultValue=""
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-caption font-semibold text-warm-600 uppercase tracking-wider">
            Owner Account
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" name="ownerFirstName" placeholder="Kwame" required />
            <Field label="Last Name" name="ownerLastName" placeholder="Asante" required />
          </div>
          <Field
            label="Email"
            name="ownerEmail"
            type="email"
            placeholder="owner@example.com"
            required
          />
          <Field label="Phone" name="ownerPhone" placeholder="024 123 4567" required />
        </section>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-brand text-[#FAF8F5] py-2.5 rounded-7 text-ui font-semibold hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Provisioning…' : 'Create Laundry & Owner'}
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  hint,
  defaultValue,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  hint?: string
  defaultValue?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-label font-medium text-warm-800 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full border border-warm-300 rounded-7 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
      />
      {hint && <p className="text-caption text-warm-500 mt-1">{hint}</p>}
    </div>
  )
}
