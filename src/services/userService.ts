import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface NewUserData {
  uid:        string
  prenom:     string
  nom:        string
  initiales:  string
  email:      string
  role:       string
  avatarColor: string
}

/** Crée le document users/{uid} — accepte une instance Firestore alternative (ex: dbSecondary) */
export async function createUserDocument(uid: string, data: NewUserData, dbInstance: Firestore = db): Promise<void> {
  await setDoc(doc(dbInstance, 'users', uid), {
    ...data,
    createdAt:   Timestamp.now(),
    lastLoginAt: Timestamp.now(),
  })
}

/** Met à jour des champs du profil utilisateur (merge) */
export async function updateUserProfile(uid: string, fields: Record<string, unknown>): Promise<void> {
  await setDoc(doc(db, 'users', uid), fields, { merge: true })
}
