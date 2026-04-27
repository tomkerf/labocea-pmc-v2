import { create } from 'zustand'
import type { Tuyau } from '@/types'

interface TuyauxStore {
  tuyaux: Tuyau[]
  loading: boolean
  error: string | null
  setTuyaux: (tuyaux: Tuyau[]) => void
  setError: (error: string | null) => void
}

export const useTuyauxStore = create<TuyauxStore>((set) => ({
  tuyaux: [],
  loading: true,
  error: null,
  setTuyaux: (tuyaux) => set({ tuyaux, loading: false }),
  setError: (error) => set({ error, loading: false }),
}))
