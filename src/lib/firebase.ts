// ============================================================
// FIREBASE — Configuration et exports
// Renseigner les valeurs dans le fichier .env.local
// ============================================================

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Persistance IndexedDB — lectures offline depuis le cache, écritures
// mises en file et synchronisées dès que le réseau revient.
// Fallback mémoire si l'IndexedDB est corrompu (ex: première ouverture après
// un changement de schéma Firestore ou cache navigateur dégradé).
function buildDb() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch {
    console.warn('[Firebase] Cache IndexedDB indisponible — fallback mémoire')
    return initializeFirestore(app, { localCache: memoryLocalCache() })
  }
}

export const db = buildDb()

export const storage = getStorage(app)

// Instance secondaire — utilisée uniquement pour créer des comptes
// sans déconnecter l'utilisateur admin courant
const secondaryApp = initializeApp(firebaseConfig, 'secondary')
export const authSecondary = getAuth(secondaryApp)
export const dbSecondary   = getFirestore(secondaryApp)
