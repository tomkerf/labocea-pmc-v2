import { create } from 'zustand'
import type { AppUser } from '@/types'

interface UsersState {
  users: AppUser[]
  setUsers: (users: AppUser[]) => void
}

/** Dédoublonnage par email — garde le doc le plus récent (createdAt) */
function deduplicateUsers(users: AppUser[]): AppUser[] {
  const map = users.reduce<Record<string, AppUser>>((acc, u) => {
    const key = u.email.toLowerCase()
    if (!acc[key] || (u.createdAt?.toMillis() ?? 0) > (acc[key].createdAt?.toMillis() ?? 0)) {
      acc[key] = u
    }
    return acc
  }, {})
  return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom))
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  setUsers: (users) => set({ users: deduplicateUsers(users) }),
}))
