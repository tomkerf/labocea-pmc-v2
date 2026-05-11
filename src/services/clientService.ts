import {
  collection, doc, getDoc,
  addDoc, deleteDoc, serverTimestamp, runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Client } from '@/types'

const COLLECTION = 'clients-v2'

export async function saveClient(client: Client, uid: string): Promise<void> {
  const ref = doc(db, COLLECTION, client.id)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    tx.set(ref, { ...client, updatedBy: uid, updatedAt: serverTimestamp() }, { merge: true })
  })
}

export async function deleteClient(clientId: string): Promise<void> {
  const ref = doc(db, COLLECTION, clientId)
  await deleteDoc(ref)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    console.error('[deleteClient] Le document existe encore après deleteDoc — règles Firestore ?', clientId)
    throw new Error('La suppression a échoué côté serveur. Vérifie les règles Firestore.')
  }
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
