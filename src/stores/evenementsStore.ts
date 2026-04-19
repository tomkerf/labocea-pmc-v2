import { create } from 'zustand'
import type { EvenementPersonnel } from '@/types'

interface EvenementsStore {
  evenements: EvenementPersonnel[]
  loading: boolean
  setEvenements: (e: EvenementPersonnel[]) => void
  setLoading: (l: boolean) => void
}

export const useEvenementsStore = create<EvenementsStore>((set) => ({
  evenements: [],
  loading: true,
  setEvenements: (evenements) => set({ evenements, loading: false }),
  setLoading: (loading) => set({ loading }),
}))
