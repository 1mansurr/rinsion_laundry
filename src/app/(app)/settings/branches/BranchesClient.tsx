'use client'

import { useState, useTransition } from 'react'
import { createBranch } from '@/services/branches'

interface Props {
  branches: { id: string; name: string }[]
  branchLimit: number
}

export function BranchesClient({ branches: init, branchLimit }: Props) {
  const [branches, setBranches] = useState(init)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const atLimit = branches.length >= branchLimit

  function handleAdd() {
    if (!name.trim()) { setError('Branch name is required.'); return }
    setError(null)
    startTransition(async () => {
      const res = await createBranch(name.trim())
      if (res.success) {
        setBranches(prev => [...prev, { id: res.data.id, name: res.data.name }])
        setName('')
        setShowForm(false)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Branches</h2>
          <span className="text-xs text-gray-400">{branches.length} of {branchLimit}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {branches.map((b, i) => (
            <div key={b.id} className="flex items-center justify-between px-5 py-3">
              <p className="text-sm text-gray-900">{b.name}</p>
              {i === 0 && <span className="text-xs text-gray-400">Main</span>}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {atLimit ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-sm text-amber-800">
            Branch limit reached ({branchLimit}/{branchLimit}).{' '}
            <a href="mailto:saymmmohamm265@gmail.com" className="font-semibold underline">Contact us</a> if you need another branch.
          </p>
        </div>
      ) : !showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + Add Branch
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">New Branch</h3>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Branch name (e.g. Airport Branch)"
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Adding…' : 'Add Branch'}
            </button>
            <button
              onClick={() => { setShowForm(false); setName(''); setError(null) }}
              className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
