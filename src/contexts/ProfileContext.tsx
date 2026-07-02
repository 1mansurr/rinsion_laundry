'use client'

import { createContext, useContext } from 'react'
import type { MyProfile } from '@/services/employees/getMyProfile'

const ProfileContext = createContext<MyProfile | null>(null)

export function ProfileProvider({
  profile,
  children,
}: {
  profile: MyProfile | null
  children: React.ReactNode
}) {
  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): MyProfile | null {
  return useContext(ProfileContext)
}
