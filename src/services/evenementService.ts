import { collection, doc, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { TypeEvenement } from '@/types'
import { COLLECTIONS } from '@/lib/constants'


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
  const ref = await trackWrite(addDoc(collection(db, COLLECTIONS.EVENEMENTS), {
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
  await trackWrite(deleteDoc(doc(db, COLLECTIONS.EVENEMENTS, id)))
}

/** Décale un événement à une nouvelle date (préserve id/createdAt). dateFin déjà recalculée par l'appelant. */
export async function updateEvenementDate(id: string, date: string, dateFin?: string): Promise<void> {
  await trackWrite(updateDoc(doc(db, COLLECTIONS.EVENEMENTS, id), {
    date,
    dateFin: dateFin || null,
  }))
}
