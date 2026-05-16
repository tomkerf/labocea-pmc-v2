import {
  collection, doc,
  addDoc, deleteDoc, serverTimestamp, runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Client } from '@/types'

const COLLECTION = 'clients-v2'

export async function saveClient(client: Client, uid: string): Promise<void> {
  const ref = doc(db, COLLECTION, client.id)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Le document client a été supprimé — modifications perdues.')
    tx.set(ref, { ...client, updatedBy: uid, updatedAt: serverTimestamp() }, { merge: true })
  })
}

export async function deleteClient(clientId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, clientId))
}

export async function createClient(
  partial: Omit<Client, 'id' | 'createdBy' | 'updatedBy' | 'updatedAt' | 'plans'>,
  uid: string,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...partial,
    plans: [],
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}
