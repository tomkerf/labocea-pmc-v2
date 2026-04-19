import { create } from 'zustand'
import type { AppUser } from '@/types'

interface UsersState {
  users: AppUser[]
  setUsers: (users: AppUser[]) => void
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  setUsers: (users) => set({ users }),
}))
