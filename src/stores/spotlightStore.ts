import { create } from 'zustand'

interface SpotlightState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useSpotlightStore = create<SpotlightState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
