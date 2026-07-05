import { create } from 'zustand'

interface ChatNotificationStore {
  unreadCount: number
  hasMention: boolean
  lastSeenTimestamp: number
  setUnreadCount: (count: number) => void
  setHasMention: (hasMention: boolean) => void
  setLastSeenTimestamp: (timestamp: number) => void
  markAsRead: () => void
}

export const useChatNotificationStore = create<ChatNotificationStore>((set) => ({
  unreadCount: 0,
  hasMention: false,
  lastSeenTimestamp: (() => {
    const val = localStorage.getItem('chat_last_seen_timestamp')
    return val ? Number(val) : 0
  })(),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setHasMention: (hasMention) => set({ hasMention }),
  setLastSeenTimestamp: (lastSeenTimestamp) => {
    localStorage.setItem('chat_last_seen_timestamp', String(lastSeenTimestamp))
    set({ lastSeenTimestamp })
  },
  markAsRead: () => {
    const now = Date.now()
    localStorage.setItem('chat_last_seen_timestamp', String(now))
    set({ unreadCount: 0, hasMention: false, lastSeenTimestamp: now })
  }
}))
