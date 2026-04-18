import { create } from 'zustand'
import type { Client } from '@/types'

interface MissionsState {
  clients: Client[]
  loading: boolean
  error: string | null
  setClients: (clients: Client[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateClientLocally: (client: Client) => void
}

export const useMissionsStore = create<MissionsState>((set) => ({
  clients: [],
  loading: true,
  error: null,
  setClients: (clients) => set({ clients, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  updateClientLocally: (updated) =>
    set((state) => ({
      clients: state.clients.map((c) => (c.id === updated.id ? updated : c)),
    })),
}))
