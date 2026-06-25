import { SidebarNav } from './SidebarNav'
import { signOut } from '@/app/login/actions'
import type { MyProfile } from '@/services/employees/getMyProfile'

export function Sidebar({ profile }: { profile: MyProfile }) {
  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="font-bold text-gray-900 text-sm tracking-tight">Rinsion</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{profile.laundryName}</p>
      </div>

      <SidebarNav role={profile.role} />

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-900 truncate">
          {profile.firstName} {profile.lastName}
        </p>
        <p className="text-xs text-gray-400 capitalize">{profile.role}</p>
        <form action={signOut} className="mt-2">
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
