// ============================================================
// FIREBASE — Configuration et exports
// Renseigner les valeurs dans le fichier .env.local
// ============================================================

import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  connectFirestoreEmulator,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

// Bascule vers le Firebase Emulator Suite (tests E2E uniquement) — jamais
// activé en dev/staging/prod, seulement quand VITE_USE_EMULATOR=true est
// explicitement passé (voir .env.test.local + playwright.config.ts).
const USE_EMULATOR = import.meta.env.VITE_USE_EMULATOR === 'true'

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
if (USE_EMULATOR) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })

// Persistance IndexedDB — lectures offline depuis le cache, écritures
// mises en file et synchronisées dès que le réseau revient.
// Fallback mémoire si l'IndexedDB est corrompu (ex: première ouverture après
// un changement de schéma Firestore ou cache navigateur dégradé).
function buildDb() {
  // Emulator : cache mémoire pour repartir d'un état propre à chaque test,
  // pas de persistance IndexedDB entre les runs.
  if (USE_EMULATOR) return initializeFirestore(app, { localCache: memoryLocalCache() })
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
if (USE_EMULATOR) connectFirestoreEmulator(db, '127.0.0.1', 8080)

export const storage = getStorage(app)
if (USE_EMULATOR) connectStorageEmulator(storage, '127.0.0.1', 9199)

// Instance secondaire — utilisée uniquement pour créer des comptes
// sans déconnecter l'utilisateur admin courant
const secondaryApp = initializeApp(firebaseConfig, 'secondary')
export const authSecondary = getAuth(secondaryApp)
export const dbSecondary   = getFirestore(secondaryApp)
if (USE_EMULATOR) {
  connectAuthEmulator(authSecondary, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(dbSecondary, '127.0.0.1', 8080)
}

// Initialisation asynchrone sécurisée de Firebase Messaging (évite de planter sous Vitest ou PWA offline)
export async function getMessagingInstance() {
  try {
    const { isSupported, getMessaging } = await import('firebase/messaging')
    const supported = await isSupported()
    if (supported) {
      return getMessaging(app)
    }
  } catch (err) {
    console.warn('[Firebase Messaging] Non supporté ou erreur de chargement :', err)
  }
  return null
}
