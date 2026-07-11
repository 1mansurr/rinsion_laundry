'use client'

import { useState, useTransition } from 'react'
import { updateSettings } from '@/services/settings/updateSettings'
import type { LaundrySettings } from '@/services/settings/getSettings'

type BooleanSettingKey = { [K in keyof LaundrySettings]: LaundrySettings[K] extends boolean ? K : never }[keyof LaundrySettings]

const TOGGLES: { key: BooleanSettingKey; label: string; description: string }[] = [
  {
    key: 'allowExpressOrders',
    label: 'Allow Express Orders',
    description: 'Staff can mark orders as express priority at intake. Does not change pricing.',
  },
  {
    key: 'requirePickupCode',
    label: 'Require Pickup Code',
    description: 'Staff must enter the customer\'s pickup code before marking an order as collected.',
  },
  {
    key: 'allowCustomerSubmissions',
    label: 'Allow Customer Submissions',
    description: 'Customers can submit orders online. This feature is coming soon.',
  },
]

export function WorkflowToggles({ settings: init }: { settings: LaundrySettings }) {
  const [settings, setSettings] = useState(init)
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState<BooleanSettingKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleToggle(key: BooleanSettingKey) {
    const newValue = !settings[key]
    setSettings(prev => ({ ...prev, [key]: newValue }))
    setSaving(key)
    setError(null)
    startTransition(async () => {
      const res = await updateSettings({ [key]: newValue })
      if (!res.success) {
        setSettings(prev => ({ ...prev, [key]: !newValue }))
        setError(res.error)
      }
      setSaving(null)
    })
  }

  return (
    <div className="space-y-0 divide-y divide-gray-100">
      {error && <p className="text-sm text-red-600 pb-3">{error}</p>}
      {TOGGLES.map(({ key, label, description }) => (
        <div key={key} className="flex items-start justify-between py-4 gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          </div>
          <button
            role="switch"
            aria-checked={settings[key]}
            onClick={() => handleToggle(key)}
            disabled={isPending}
            className={`relative flex-shrink-0 w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 ${
              settings[key] ? 'bg-gray-900' : 'bg-gray-200'
            } ${saving === key ? 'opacity-60' : ''}`}
            style={{ minWidth: '2.5rem', height: '1.375rem' }}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                settings[key] ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  )
}
