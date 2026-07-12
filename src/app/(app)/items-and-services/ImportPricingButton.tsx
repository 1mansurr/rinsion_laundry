'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ImportPricingModal } from './ImportPricingModal'

export function ImportPricingButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Import Pricing
      </Button>
      <ImportPricingModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
