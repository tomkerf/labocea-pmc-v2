import { useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore, selectAppUser } from '@/stores/authStore'
import { useChatNotificationStore } from '@/stores/chatNotificationStore'
import { COLLECTIONS } from '@/lib/constants'

export function useChatNotificationListener() {
  const appUser = useAuthStore(selectAppUser)
  const { lastSeenTimestamp, setUnreadCount, setHasMention } = useChatNotificationStore()

  useEffect(() => {
    if (!appUser) return

    // Écouter les 50 derniers messages pour détecter les nouveautés
    const q = query(
      collection(db, COLLECTIONS.CHAT_MESSAGES),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        let unread = 0
        let mentioned = false

        snap.forEach((doc) => {
          const data = doc.data()
          const senderUid = data.senderUid
          const text = data.text || ''
          const createdAt = data.createdAt

          if (!createdAt || senderUid === appUser.uid) return

          const msgTime = createdAt.toDate().getTime()

          // Si le message est postérieur au dernier vu
          if (msgTime > lastSeenTimestamp) {
            unread++

            // Vérifier s'il y a une mention (@initiales ou @prenom)
            const mentionInitials = `@${appUser.initiales.toLowerCase()}`
            const mentionName = `@${appUser.prenom.toLowerCase()}`
            const textLower = text.toLowerCase()

            if (textLower.includes(mentionInitials) || textLower.includes(mentionName)) {
              mentioned = true
            }
          }
        })

        setUnreadCount(unread)
        setHasMention(mentioned)
      },
      (err) => {
        console.error('Erreur écouteur notifications chat:', err)
      }
    )

    return () => unsub()
  }, [appUser, lastSeenTimestamp, setUnreadCount, setHasMention])
}
