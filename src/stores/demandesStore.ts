import { create } from 'zustand'
import type { Demande } from '@/types'

interface DemandesStore {
  demandes: Demande[]
  loading: boolean
  setDemandes: (d: Demande[]) => void
}

export const useDemandesStore = create<DemandesStore>((set) => ({
  demandes: [],
  loading: true,
  setDemandes: (demandes) => set({ demandes, loading: false }),
}))
