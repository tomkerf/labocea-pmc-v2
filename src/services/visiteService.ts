import {
  collection, doc,
  addDoc, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import { COLLECTIONS } from '@/lib/constants'
import type { VisitePreliminaire } from '@/types'

const COLLECTION = COLLECTIONS.VISITES

export async function createVisite(
  visite: Omit<VisitePreliminaire, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await trackWrite(addDoc(collection(db, COLLECTION), {
    ...visite,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  return ref.id
}

export async function saveVisite(visite: VisitePreliminaire): Promise<void> {
  await trackWrite(setDoc(doc(db, COLLECTION, visite.id), {
    ...visite,
    updatedAt: serverTimestamp(),
  }, { merge: true }))
}

export async function deleteVisite(visiteId: string): Promise<void> {
  await trackWrite(deleteDoc(doc(db, COLLECTION, visiteId)))
}
