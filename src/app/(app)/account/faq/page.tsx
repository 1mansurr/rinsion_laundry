'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FAQS } from '@/constants/faq'

export default function AccountFaqPage() {
  const [open, setOpen] = useState<Record<number, boolean>>({})

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4 md:px-7 md:py-7">
      <div className="mb-[18px]">
        <Link href="/account" className="text-caption font-semibold text-warm-700 hover:text-warm-950">← Account</Link>
        <h1 className="text-[27px] font-semibold text-warm-950 tracking-[-0.02em] leading-tight mt-2">Frequently Asked Questions</h1>
      </div>

      <div className="bg-white border border-warm-300 rounded-18 overflow-hidden">
        {FAQS.map((f, i) => (
          <div key={f.q} className="border-b border-warm-100 last:border-0">
            <button
              type="button"
              onClick={() => setOpen(s => ({ ...s, [i]: !s[i] }))}
              className="w-full text-left cursor-pointer bg-transparent border-0 px-[22px] py-[18px] flex items-center justify-between gap-3.5 hover:bg-warm-50 transition-colors"
            >
              <span className="text-ui font-semibold text-warm-950">{f.q}</span>
              <span className="text-[20px] font-normal text-clay flex-none leading-none">{open[i] ? '–' : '+'}</span>
            </button>
            {open[i] && (
              <p className="px-[22px] pb-[18px] text-ui text-warm-700 leading-[1.5]">{f.a}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
