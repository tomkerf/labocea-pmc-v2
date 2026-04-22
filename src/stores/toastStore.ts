import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastState {
  toasts: Toast[]
  add: (type: ToastType, message: string) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (type, message) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    // Auto-dismiss : 4s pour les infos/succès, 6s pour les erreurs
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, type === 'error' ? 6000 : 4000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// ── Helpers directs (utilisables hors composants React) ─────
export const toast = {
  success: (msg: string) => useToastStore.getState().add('success', msg),
  error:   (msg: string) => useToastStore.getState().add('error',   msg),
  info:    (msg: string) => useToastStore.getState().add('info',    msg),
}
