import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Verification } from '@/types'

export async function saveVerification(verification: Verification, uid: string): Promise<void> {
  const ref = doc(db, 'verifications', verification.id)
  await setDoc(ref, { ...verification, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true })
}

export async function createVerification(uid: string, technicienNom: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const ref = await addDoc(collection(db, 'verifications'), {
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
    createdAt: serverTimestamp(),
  })
  return ref.id
}
