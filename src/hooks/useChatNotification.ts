import { useEffect, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore, selectAppUser } from '@/stores/authStore'
import { useChatNotificationStore } from '@/stores/chatNotificationStore'
import { COLLECTIONS } from '@/lib/constants'

export function useChatNotificationListener() {
  const appUser = useAuthStore(selectAppUser)
  const { lastSeenTimestamps, setUnreadCounts, setHasMention } = useChatNotificationStore()

  // Référence pour stocker les comptes non lus de chaque écouteur pour éviter de boucler
  const unreadStateRef = useRef<Record<string, { count: number; hasMention: boolean }>>({})

  useEffect(() => {
    if (!appUser) return

    unreadStateRef.current = {}

    const updateStore = () => {
      const counts: Record<string, number> = {}
      let globalMention = false

      Object.entries(unreadStateRef.current).forEach(([chatId, state]) => {
        counts[chatId] = state.count
        if (state.hasMention) {
          globalMention = true
        }
      })

      setUnreadCounts(counts)
      setHasMention(globalMention)
    }

    // 1. Écouteur pour le canal général
    const qGeneral = query(
      collection(db, COLLECTIONS.CHAT_MESSAGES),
      where('chatId', '==', 'general'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsubGeneral = onSnapshot(
      qGeneral,
      (snap) => {
        let count = 0
        let mentioned = false
        const lastSeen = lastSeenTimestamps['general'] || 0

        snap.forEach((doc) => {
          const data = doc.data()
          const senderUid = data.senderUid
          const text = data.text || ''
          const createdAt = data.createdAt

          if (!createdAt || senderUid === appUser.uid) return

          const msgTime = createdAt.toDate().getTime()

          if (msgTime > lastSeen) {
            count++
            const mentionInitials = `@${appUser.initiales.toLowerCase()}`
            const mentionName = `@${appUser.prenom.toLowerCase()}`
            const textLower = text.toLowerCase()

            if (textLower.includes(mentionInitials) || textLower.includes(mentionName)) {
              mentioned = true
            }
          }
        })

        unreadStateRef.current['general'] = { count, hasMention: mentioned }
        updateStore()
      },
      (err) => {
        console.error('Erreur notifications chat général:', err)
      }
    )

    // 2. Écouteur pour les Direct Messages (DMs) privés
    const qDms = query(
      collection(db, COLLECTIONS.CHAT_MESSAGES),
      where('participants', 'array-contains', appUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsubDms = onSnapshot(
      qDms,
      (snap) => {
        // Regrouper les messages par chatId (ex: uidA_uidB)
        const dmsByChat: Record<string, { count: number; hasMention: boolean }> = {}

        snap.forEach((doc) => {
          const data = doc.data()
          const chatId = data.chatId
          if (!chatId || chatId === 'general') return

          const senderUid = data.senderUid
          const text = data.text || ''
          const createdAt = data.createdAt

          if (!createdAt || senderUid === appUser.uid) return

          const lastSeen = lastSeenTimestamps[chatId] || 0
          const msgTime = createdAt.toDate().getTime()

          if (!dmsByChat[chatId]) {
            dmsByChat[chatId] = { count: 0, hasMention: false }
          }

          if (msgTime > lastSeen) {
            dmsByChat[chatId].count++
            const mentionInitials = `@${appUser.initiales.toLowerCase()}`
            const mentionName = `@${appUser.prenom.toLowerCase()}`
            const textLower = text.toLowerCase()

            if (textLower.includes(mentionInitials) || textLower.includes(mentionName)) {
              dmsByChat[chatId].hasMention = true
            }
          }
        })

        // Nettoyer les anciens DMs du cache ref pour ne pas garder de résidus
        Object.keys(unreadStateRef.current).forEach((key) => {
          if (key !== 'general' && !dmsByChat[key]) {
            unreadStateRef.current[key] = { count: 0, hasMention: false }
          }
        })

        // Fusionner dans unreadStateRef
        Object.entries(dmsByChat).forEach(([chatId, state]) => {
          unreadStateRef.current[chatId] = state
        })

        updateStore()
      },
      (err) => {
        console.error('Erreur notifications chat DMs:', err)
      }
    )

    return () => {
      unsubGeneral()
      unsubDms()
    }
  }, [appUser, lastSeenTimestamps, setUnreadCounts, setHasMention])
}
