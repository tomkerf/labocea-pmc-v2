import { create } from 'zustand'
import type { PointRejet } from '@/types'

interface PointsRejetStore {
  pointsRejet: PointRejet[]
  loading: boolean
  error: string | null
  setPointsRejet: (pointsRejet: PointRejet[]) => void
  setError: (error: string | null) => void
}

export const usePointsRejetStore = create<PointsRejetStore>((set) => ({
  pointsRejet: [],
  loading: true,
  error: null,
  setPointsRejet: (pointsRejet) => set({ pointsRejet, loading: false }),
  setError: (error) => set({ error, loading: false }),
}))

export const selectPointsRejet = (s: PointsRejetStore) => s.pointsRejet
