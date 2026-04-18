import { useEffect } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import type { AppUser } from '@/types'

export function useAuthInit() {
  const { setFirebaseUser, setAppUser, setLoading, setInitialized, reset } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)

      if (user) {
        // Charger le profil Firestore
        const userRef = doc(db, 'users', user.uid)
        const snap = await getDoc(userRef)

        if (snap.exists()) {
          setAppUser(snap.data() as AppUser)
        } else {
          // Premier login — créer le profil
          const newUser: Omit<AppUser, 'uid'> = {
            prenom: user.displayName?.split(' ')[0] ?? '',
            nom: user.displayName?.split(' ').slice(1).join(' ') ?? '',
            initiales: '',
            email: user.email ?? '',
            role: 'technicien',
            createdAt: serverTimestamp() as any,
            lastLoginAt: serverTimestamp() as any,
          }
          await setDoc(userRef, { uid: user.uid, ...newUser })
          setAppUser({ uid: user.uid, ...newUser } as AppUser)
        }

        // Mettre à jour lastLoginAt
        await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true })
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
