import { create } from 'zustand'
import type { User } from 'firebase/auth'
import type { AppUser, UserRole } from '@/types'

interface AuthState {
  // Firebase Auth user
  firebaseUser: User | null
  // Profil Firestore enrichi
  appUser: AppUser | null
  // États de chargement
  loading: boolean
  initialized: boolean

  // Actions
  setFirebaseUser: (user: User | null) => void
  setAppUser: (user: AppUser | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  reset: () => void

  // Getters dérivés
  isAuthenticated: () => boolean
  uid: () => string | null
  prenom: () => string
  initiales: () => string
  role: () => UserRole | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  appUser: null,
  loading: true,
  initialized: false,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setAppUser: (user) => set({ appUser: user }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set({ firebaseUser: null, appUser: null, loading: false }),

  isAuthenticated: () => get().firebaseUser !== null,
  uid: () => get().firebaseUser?.uid ?? null,
  prenom: () => get().appUser?.prenom ?? '',
  initiales: () => get().appUser?.initiales ?? '',
  role: () => get().appUser?.role ?? null,
}))
