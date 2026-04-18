import { create } from 'zustand'
import type { Maintenance } from '@/types'

interface MaintenancesStore {
  maintenances: Maintenance[]
  loading: boolean
  error: string | null
  setMaintenances: (maintenances: Maintenance[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useMaintenancesStore = create<MaintenancesStore>((set) => ({
  maintenances: [],
  loading: true,
  error: null,
  setMaintenances: (maintenances) => set({ maintenances, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}))
