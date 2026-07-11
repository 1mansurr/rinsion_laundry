import { TEMPLATES } from '@/services/platform/templates'
import { ProvisionForm } from './ProvisionForm'

export default function ProvisionPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-warm-950 mb-6">Provision Laundry</h1>
      <ProvisionForm templates={TEMPLATES} />
    </div>
  )
}
