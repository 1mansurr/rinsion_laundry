'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DirectoryLaundry } from '@/services/laundries/getPublicLaundryDirectory'

export function DirectorySearch({ laundries }: { laundries: DirectoryLaundry[] }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q ? laundries.filter(l => l.name.toLowerCase().includes(q)) : laundries

  return (
    <div className="bg-white rounded-18 border border-warm-300 p-6 space-y-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search laundries…"
        className="w-full border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
      />

      {filtered.length === 0 ? (
        <p className="text-body text-warm-600">No laundries found.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map(l => (
            <li key={l.id}>
              <Link
                href={`/portal/o/${l.publicSlug}`}
                className="block border border-warm-300 rounded-12 px-3 py-2 text-ui text-warm-950 hover:border-brand transition-colors"
              >
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
