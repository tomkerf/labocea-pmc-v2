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
    
    // Titre de l'onglet du navigateur (ex: (1) Labocea PMC)
    if (total > 0) {
      document.title = `(${total}) Labocea PMC`
    } else {
      document.title = 'Labocea PMC'
    }

    // Pastille native d'application (App Badging API pour iOS/Android PWA)
    if ('setAppBadge' in navigator) {
      if (total > 0) {
        navigator.setAppBadge(total).catch(err => console.error('Erreur setAppBadge:', err))
      } else {
        navigator.clearAppBadge().catch(err => console.error('Erreur clearAppBadge:', err))
      }
    }
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

    // Titre de l'onglet du navigateur (ex: (1) Labocea PMC)
    if (total > 0) {
      document.title = `(${total}) Labocea PMC`
    } else {
      document.title = 'Labocea PMC'
    }

    // Pastille native d'application (App Badging API pour iOS/Android PWA)
    if ('setAppBadge' in navigator) {
      if (total > 0) {
        navigator.setAppBadge(total).catch(err => console.error('Erreur setAppBadge:', err))
      } else {
        navigator.clearAppBadge().catch(err => console.error('Erreur clearAppBadge:', err))
      }
    }
  }
}))
