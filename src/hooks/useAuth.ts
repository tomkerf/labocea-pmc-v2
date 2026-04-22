import { useEffect } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, FieldValue } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import type { AppUser } from '@/types'
import type { Timestamp } from 'firebase/firestore'

/** Profil tel qu'il est écrit dans Firestore à la création (timestamps = FieldValue) */
type NewUserDoc = Omit<AppUser, 'uid' | 'createdAt' | 'lastLoginAt'> & {
  createdAt: FieldValue
  lastLoginAt: FieldValue
}

export function useAuthInit() {
  const { setFirebaseUser, setAppUser, setLoading, setInitialized, reset } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)

      if (user) {
        try {
          // Charger le profil Firestore
          const userRef = doc(db, 'users', user.uid)
          const snap = await getDoc(userRef)

          if (snap.exists()) {
            setAppUser(snap.data() as AppUser)
          } else {
            // Premier login — créer le profil
            const newUserDoc: NewUserDoc = {
              prenom: user.displayName?.split(' ')[0] ?? '',
              nom: user.displayName?.split(' ').slice(1).join(' ') ?? '',
              initiales: '',
              email: user.email ?? '',
              role: 'technicien',
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            }
            await setDoc(userRef, { uid: user.uid, ...newUserDoc })
            // Pour le store en mémoire, on substitue des timestamps temporaires
            const now = { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown as Timestamp
            setAppUser({ uid: user.uid, ...newUserDoc, createdAt: now, lastLoginAt: now })
          }

          // Mettre à jour lastLoginAt
          await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true })
        } catch (err) {
          console.error('[useAuthInit] Erreur Firestore au login :', err)
          // On laisse l'utilisateur connecté Firebase mais sans profil enrichi
          // → l'app restera fonctionnelle, profil sera rechargé au prochain onAuthStateChanged
        }
      } else {
        reset()
      }

      setLoading(false)
      setInitialized(true)
    })

    return () => unsubscribe()
  }, [])
}

export async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function logout() {
  return signOut(auth)
}
