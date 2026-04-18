import { useEffect } from 'react'
import {
  collection, onSnapshot, doc,
  setDoc, addDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useMissionsStore } from '@/stores/missionsStore'
import type { Client } from '@/types'

const COLLECTION = 'clients-v2'

/** Écoute temps réel sur toute la collection clients-v2 */
export function useClientsListener() {
  const { setClients, setError } = useMissionsStore()

  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy('nom'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const clients = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client))
        setClients(clients)
      },
      (err) => setError(err.message),
    )
    return () => unsub()
  }, [])
}

/** Sauvegarde un client existant (merge) */
export async function saveClient(client: Client, uid: string): Promise<void> {
  const ref = doc(db, COLLECTION, client.id)
  await setDoc(ref, {
    ...client,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/** Crée un nouveau client */
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
