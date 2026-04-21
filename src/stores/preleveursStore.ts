import { create } from 'zustand'

export interface Preleveur {
  id: string
  code: string   // initiales ex: "THK"
  nom: string    // nom complet ex: "Thomas Kerfendal"
  site?: string
  telephone?: string
  email?: string
  vehicule?: string
}

interface PreleveursStore {
  preleveurs: Preleveur[]
  loading: boolean
  setPreleveurs: (p: Preleveur[]) => void
}

export const usePreleveursStore = create<PreleveursStore>((set) => ({
  preleveurs: [],
  loading: true,
  setPreleveurs: (preleveurs) => set({ preleveurs, loading: false }),
}))
