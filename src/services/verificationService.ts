import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { Verification } from '@/types'
import { COLLECTIONS } from '@/lib/constants'


export async function saveVerification(verification: Verification, uid: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.VERIFICATIONS, verification.id)
  await trackWrite(setDoc(ref, { ...verification, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true }))
}

export async function createVerification(
  uid: string,
  technicienNom: string,
  initial?: Partial<Omit<Verification, 'id' | 'createdAt'>>
): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const ref = await trackWrite(addDoc(collection(db, COLLECTIONS.VERIFICATIONS), {
    equipementId: '',
    equipementNom: '',
    type: 'etalonnage_interne',
    date: today,
    resultat: 'conforme',
    remarques: '',
    prochainControle: '',
    technicienUid: uid,
    technicienNom,
    documentUrl: '',
    ...initial,
    createdAt: serverTimestamp(),
  }))
  return ref.id
}
