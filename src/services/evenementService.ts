import { collection, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { TypeEvenement } from '@/types'

export async function createEvenement(
  titre: string,
  date: string,
  type: TypeEvenement,
  heure: string,
  notes: string,
  uid: string,
  initiales?: string,
  dateFin?: string,
): Promise<string> {
  const ref = await trackWrite(addDoc(collection(db, 'evenements'), {
    titre,
    date,
    type,
    dateFin: dateFin || null,
    heure: heure || null,
    notes: notes || null,
    createdBy: uid,
    createdByInitiales: initiales || null,
    createdAt: serverTimestamp(),
  }))
  return ref.id
}

export async function deleteEvenement(id: string): Promise<void> {
  await trackWrite(deleteDoc(doc(db, 'evenements', id)))
}
