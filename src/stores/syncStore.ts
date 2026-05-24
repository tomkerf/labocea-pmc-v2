import { create } from 'zustand'

interface SyncState {
  pendingWrites: number
  isOnline: boolean
  increment: () => void
  decrement: () => void
  setOnline: (v: boolean) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingWrites: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  increment: () => set((s) => ({ pendingWrites: s.pendingWrites + 1 })),
  decrement: () => set((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) })),
  setOnline: (v) => set({ isOnline: v }),
}))

export type SyncStatus = 'synced' | 'syncing' | 'offline'

export function getSyncStatus(state: Pick<SyncState, 'isOnline' | 'pendingWrites'>): SyncStatus {
  if (!state.isOnline) return 'offline'
  if (state.pendingWrites > 0) return 'syncing'
  return 'synced'
}
