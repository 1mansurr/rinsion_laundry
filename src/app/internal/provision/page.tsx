import { TEMPLATES } from '@/services/platform/templates'
import { ProvisionForm } from './ProvisionForm'

export default function ProvisionPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-h2 font-semibold text-warm-950 mb-6">Provision Laundry</h1>
      <ProvisionForm templates={TEMPLATES} />
    </div>
  )
}
