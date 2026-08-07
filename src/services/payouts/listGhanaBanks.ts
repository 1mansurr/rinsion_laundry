'use server'

import { unstable_cache } from 'next/cache'
import { listBanks } from '@/lib/payments/paystackClient'

export interface BankChoice {
  name: string
  code: string
  isMobileMoney: boolean
}

/** Both real banks and MoMo networks (as pseudo-banks) — Paystack's own bank list rarely changes, so this is cached for a day. */
export const listGhanaBanks = unstable_cache(
  async (): Promise<BankChoice[]> => {
    const res = await listBanks()
    if (!res.status) return []
    return res.data.map(b => ({
      name: b.name,
      code: b.code,
      isMobileMoney: b.type === 'mobile_money',
    }))
  },
  ['ghana-banks'],
  { revalidate: 60 * 60 * 24 }
)
