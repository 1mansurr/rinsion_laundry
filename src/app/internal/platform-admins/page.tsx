import { listPlatformAdmins } from '@/services/platform/listPlatformAdmins'
import { requirePlatformAdmin } from '@/services/platform/requirePlatformAdmin'
import { PlatformAdminsClient } from './PlatformAdminsClient'

export default async function PlatformAdminsPage() {
  const [admins, callerId] = await Promise.all([
    listPlatformAdmins(),
    requirePlatformAdmin(),
  ])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-h2 font-semibold text-warm-950 mb-6">Platform Admins</h1>
      <PlatformAdminsClient admins={admins} currentAdminId={callerId ?? ''} />
    </div>
  )
}
