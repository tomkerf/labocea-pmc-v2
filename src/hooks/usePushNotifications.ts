import { useState, useEffect } from 'react'
import { getMessagingInstance, db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore'
import { useAuthStore, selectAppUser } from '@/stores/authStore'

export default function usePushNotifications() {
  const appUser = useAuthStore(selectAppUser)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isPushEnabled, setIsPushEnabled] = useState(false)

  // Clé VAPID Firebase FCM pour le Web Push
  const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

  useEffect(() => {
    // Vérifier si les API de notification et service workers sont disponibles
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window

    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
      checkIfTokenSynced()
    }
  }, [appUser])

  // Vérifier si un token FCM valide existe déjà sur cet appareil et est synchronisé dans Firestore
  const checkIfTokenSynced = async () => {
    if (!appUser) return
    try {
      const messaging = await getMessagingInstance()
      if (!messaging) return

      const { getToken } = await import('firebase/messaging')
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY }).catch(() => null)

      if (currentToken) {
        // Lire le document utilisateur pour voir si le token est déjà enregistré
        const userRef = doc(db, 'users', appUser.uid)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          const userData = userSnap.data()
          const tokens = userData.pushTokens || []
          setIsPushEnabled(tokens.includes(currentToken))
        }
      } else {
        setIsPushEnabled(false)
      }
    } catch (err) {
      console.warn('[Push Notification] Impossible de vérifier la synchro du token :', err)
      setIsPushEnabled(false)
    }
  }

  // Activer les notifications push sur l'appareil actuel
  const enableNotifications = async (): Promise<boolean> => {
    if (!isSupported || !appUser) return false
    setLoading(true)

    try {
      // 1. Demander la permission à l'utilisateur
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        throw new Error('Permission de notification refusée.')
      }

      // 2. Récupérer l'instance Firebase Messaging
      const messaging = await getMessagingInstance()
      if (!messaging) {
        throw new Error('Firebase Messaging non supporté sur ce navigateur.')
      }

      // 3. Demander le token FCM de l'appareil
      const { getToken } = await import('firebase/messaging')
      const token = await getToken(messaging, { vapidKey: VAPID_KEY })

      if (!token) {
        throw new Error('Aucun jeton de notification généré.')
      }

      // 4. Synchroniser le token dans le profil Firestore du technicien
      const userRef = doc(db, 'users', appUser.uid)
      await updateDoc(userRef, {
        pushTokens: arrayUnion(token)
      })

      setIsPushEnabled(true)
      setLoading(false)
      return true
    } catch (err) {
      console.error('[Push Notification] Erreur lors de l\'activation :', err)
      setLoading(false)
      return false
    }
  }

  // Désactiver les notifications push sur l'appareil actuel
  const disableNotifications = async (): Promise<boolean> => {
    if (!isSupported || !appUser) return false
    setLoading(true)

    try {
      const messaging = await getMessagingInstance()
      if (!messaging) {
        throw new Error('Firebase Messaging non disponible.')
      }

      const { getToken, deleteToken } = await import('firebase/messaging')
      const token = await getToken(messaging, { vapidKey: VAPID_KEY }).catch(() => null)

      if (token) {
        // 1. Supprimer le token du client FCM
        await deleteToken(messaging).catch(() => null)

        // 2. Retirer le token du profil Firestore
        const userRef = doc(db, 'users', appUser.uid)
        await updateDoc(userRef, {
          pushTokens: arrayRemove(token)
        })
      }

      setIsPushEnabled(false)
      setLoading(false)
      return true
    } catch (err) {
      console.error('[Push Notification] Erreur lors de la désactivation :', err)
      setLoading(false)
      return false
    }
  }

  return {
    isSupported,
    permission,
    isPushEnabled,
    loading,
    enableNotifications,
    disableNotifications,
    checkIfTokenSynced
  }
}
