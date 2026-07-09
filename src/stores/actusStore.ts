import { create } from 'zustand'
import type { Actu } from '@/types'

interface ActusStore {
  actus: Actu[]
  loading: boolean
  error: string | null
  setActus: (actus: Actu[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateActuLocally: (actu: Actu) => void
}

export const useActusStore = create<ActusStore>((set) => ({
  actus: [],
  loading: true,
  error: null,
  setActus: (actus) => set({ actus, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  updateActuLocally: (actu) =>
    set((state) => ({
      actus: state.actus.map((a) => (a.id === actu.id ? actu : a)),
    })),
}))
