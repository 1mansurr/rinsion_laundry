import { SidebarNav } from './SidebarNav'
import { Wordmark } from './ui/Wordmark'
import { GlobalSearch } from './ui/GlobalSearch'
import { signOut } from '@/app/login/actions'
import type { MyProfile } from '@/services/employees/getMyProfile'

export function Sidebar({ profile }: { profile: MyProfile }) {
  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase()

  return (
    <aside className="hidden min-[720px]:flex w-[220px] flex-shrink-0 bg-white border-r border-warm-300 flex-col h-screen sticky top-0">
      <div className="px-5 py-[18px] border-b border-warm-200">
        <Wordmark size="sm" />
        <p className="text-caption text-warm-700 mt-1.5 truncate">{profile.laundryName}</p>
      </div>

      <div className="px-3 py-2 border-b border-warm-200">
        <GlobalSearch />
      </div>

      <SidebarNav role={profile.role} />

      <div className="px-4 py-4 border-t border-warm-200">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-7 h-7 rounded-full bg-brand text-[#FAF8F5] flex items-center justify-center text-caption font-semibold shrink-0">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="text-caption font-medium text-warm-950 truncate leading-tight">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-micro text-warm-600 capitalize">{profile.role}</p>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-caption text-warm-600 hover:text-warm-950 transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
