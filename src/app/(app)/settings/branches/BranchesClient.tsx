'use client'

import { useState, useTransition } from 'react'
import { createBranch } from '@/services/branches'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'

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
      <div className="bg-white rounded-18 border border-warm-300">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-warm-100">
          <h2 className="text-sm font-semibold text-warm-950">Branches</h2>
          <span className="text-xs text-warm-600">{branches.length} of {branchLimit}</span>
        </div>
        <div className="divide-y divide-warm-100">
          {branches.map((b, i) => (
            <div key={b.id} className="flex items-center justify-between px-5 py-3">
              <p className="text-sm text-warm-950">{b.name}</p>
              {i === 0 && <span className="text-xs text-warm-600">Main</span>}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {atLimit ? (
        <Banner variant="warning">
          Branch limit reached ({branchLimit}/{branchLimit}).{' '}
          <a href="mailto:saymmmohamm265@gmail.com" className="font-semibold underline">Contact us</a> if you need another branch.
        </Banner>
      ) : !showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed border-warm-300 rounded-12 py-3 text-sm text-warm-600 hover:border-warm-500 hover:text-warm-800 transition-colors"
        >
          + Add Branch
        </button>
      ) : (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-warm-950">New Branch</h3>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Branch name (e.g. Airport Branch)"
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={handleAdd} isPending={isPending}>
              Add Branch
            </Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); setName(''); setError(null) }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
