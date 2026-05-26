import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'

interface PushPayload {
  tokens: string[]
  title:  string
  body:   string
  path?:  string
}

/**
 * Envoie une notification push à un utilisateur via l'API sécurisée du Cloudflare Worker.
 * Récupère d'abord ses pushTokens enregistrés dans Firestore.
 */
export async function sendPushNotification(
  recipientUid: string,
  title:        string,
  body:         string,
  path?:        string
): Promise<boolean> {
  try {
    // 1. Récupérer les tokens FCM du destinataire
    const userRef = doc(db, 'users', recipientUid)
    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) {
      console.warn(`[Notification] Utilisateur destinataire ${recipientUid} inexistant.`);
      return false
    }

    const userData = userSnap.data()
    const tokens = userData.pushTokens || []

    if (tokens.length === 0) {
      console.log(`[Notification] Aucun token push pour l'utilisateur ${recipientUid} (notifications désactivées/non configurées).`);
      return false
    }

    // 2. Obtenir l'ID Token Firebase du technicien appelant (expéditeur)
    const currentUser = auth.currentUser
    if (!currentUser) {
      console.warn('[Notification] Expéditeur non authentifié.');
      return false
    }

    const idToken = await currentUser.getIdToken()

    // 3. Appeler le proxy d'envoi du Cloudflare Worker
    const payload: PushPayload = { tokens, title, body, path }
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erreur API Worker FCM: ${errorText}`);
    }

    const result = await response.json()
    console.log('[Notification] Résultat envoi push :', result);
    return true
  } catch (err) {
    console.error('[Notification] Impossible d\'envoyer la notification push :', err)
    return false
  }
}

/**
 * Envoie une notification push à un technicien identifié par ses initiales.
 * Recherche son compte utilisateur dans Firestore pour obtenir son UID.
 */
export async function sendPushToTechnician(
  initials: string,
  title:    string,
  body:     string,
  path?:    string,
  allowSelfNotification?: boolean
): Promise<boolean> {
  try {
    if (!initials || initials === '—') return false

    // 1. Chercher le technicien par ses initiales dans Firestore
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('initiales', '==', initials), limit(1))
    const querySnap = await getDocs(q)

    if (querySnap.empty) {
      console.warn(`[Notification] Aucun technicien trouvé avec les initiales : ${initials}`);
      return false
    }

    const targetUserDoc = querySnap.docs[0]
    const recipientUid = targetUserDoc.id

    // Ne pas envoyer si le destinataire est l'expéditeur lui-même, SAUF si allowSelfNotification est true
    if (!allowSelfNotification && auth.currentUser && recipientUid === auth.currentUser.uid) {
      return false
    }

    // 2. Envoyer la notification push
    return await sendPushNotification(recipientUid, title, body, path)
  } catch (err) {
    console.error('[Notification] Impossible d\'envoyer par initiales :', err)
    return false
  }
}
