import { create } from 'zustand'
import type { Verification } from '@/types'

interface MetrologieStore {
  verifications: Verification[]
  loading: boolean
  error: string | null
  setVerifications: (verifications: Verification[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useMetrologieStore = create<MetrologieStore>((set) => ({
  verifications: [],
  loading: true,
  error: null,
  setVerifications: (verifications) => set({ verifications, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}))
