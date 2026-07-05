import { create } from 'zustand'

interface ChatNotificationStore {
  unreadCount: number                    // Total global non lus
  hasMention: boolean                    // Présence de mention non lue
  lastSeenTimestamps: Record<string, number> // Timestamps par chatId
  unreadCounts: Record<string, number>    // Non lus par chatId
  setUnreadCounts: (counts: Record<string, number>) => void
  setHasMention: (hasMention: boolean) => void
  getLastSeenTimestamp: (chatId: string) => number
  markAsRead: (chatId: string) => void
}

export const useChatNotificationStore = create<ChatNotificationStore>((set, get) => ({
  unreadCount: 0,
  hasMention: false,
  lastSeenTimestamps: (() => {
    try {
      const val = localStorage.getItem('chat_last_seen_timestamps')
      return val ? JSON.parse(val) : {}
    } catch {
      return {}
    }
  })(),
  unreadCounts: {},
  setUnreadCounts: (unreadCounts) => {
    const total = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0)
    set({ unreadCounts, unreadCount: total })
  },
  setHasMention: (hasMention) => set({ hasMention }),
  getLastSeenTimestamp: (chatId) => {
    return get().lastSeenTimestamps[chatId] || 0
  },
  markAsRead: (chatId) => {
    const now = Date.now()
    const updatedTimestamps = { ...get().lastSeenTimestamps, [chatId]: now }
    localStorage.setItem('chat_last_seen_timestamps', JSON.stringify(updatedTimestamps))
    
    // Mettre à jour localement unreadCounts pour ce chatId à 0
    const updatedUnreadCounts = { ...get().unreadCounts, [chatId]: 0 }
    const total = Object.values(updatedUnreadCounts).reduce((acc, count) => acc + count, 0)
    
    set({ 
      lastSeenTimestamps: updatedTimestamps,
      unreadCounts: updatedUnreadCounts,
      unreadCount: total
    })
  }
}))
