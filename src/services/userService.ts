import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'

export interface NewUserData {
  uid:        string
  prenom:     string
  nom:        string
  initiales:  string
  email:      string
  role:       string
  avatarColor: string
}

export async function createUserDocument(uid: string, data: NewUserData, dbInstance: Firestore = db): Promise<void> {
  await trackWrite(setDoc(doc(dbInstance, 'users', uid), {
    ...data,
    createdAt:   Timestamp.now(),
    lastLoginAt: Timestamp.now(),
  }))
}

export async function updateUserProfile(uid: string, fields: Record<string, unknown>): Promise<void> {
  await trackWrite(setDoc(doc(db, 'users', uid), fields, { merge: true }))
}
