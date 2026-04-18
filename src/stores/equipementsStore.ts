import { create } from 'zustand'
import type { Equipement } from '@/types'

interface EquipementsStore {
  equipements: Equipement[]
  loading: boolean
  error: string | null
  setEquipements: (equipements: Equipement[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateEquipementLocally: (equipement: Equipement) => void
}

export const useEquipementsStore = create<EquipementsStore>((set) => ({
  equipements: [],
  loading: true,
  error: null,
  setEquipements: (equipements) => set({ equipements, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  updateEquipementLocally: (equipement) =>
    set((state) => ({
      equipements: state.equipements.map((e) => (e.id === equipement.id ? equipement : e)),
    })),
}))
