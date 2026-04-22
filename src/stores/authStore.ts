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
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  appUser: null,
  loading: true,
  initialized: false,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setAppUser: (user) => set({ appUser: user }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set({ firebaseUser: null, appUser: null, loading: false }),
}))

// ── Sélecteurs nommés — à utiliser dans les composants ──────────
// Préférer ces sélecteurs aux anciennes méthodes du store :
//   ✓  const uid = useAuthStore(selectUid)
//   ✗  const uid = useAuthStore(s => s.uid())
export const selectUid            = (s: AuthState): string | null  => s.firebaseUser?.uid ?? null
export const selectPrenom         = (s: AuthState): string         => s.appUser?.prenom ?? ''
export const selectInitiales      = (s: AuthState): string         => s.appUser?.initiales ?? ''
export const selectRole           = (s: AuthState): UserRole | null => s.appUser?.role ?? null
export const selectIsAuthenticated = (s: AuthState): boolean       => s.firebaseUser !== null
export const selectAppUser        = (s: AuthState): AppUser | null => s.appUser
