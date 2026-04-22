import { useEffect } from 'react'
import {
  collection, onSnapshot, doc,
  addDoc, deleteDoc, serverTimestamp, query, orderBy, runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useMissionsStore } from '@/stores/missionsStore'
import { toast } from '@/stores/toastStore'
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
      (err) => {
        setError(err.message)
        toast.error('Erreur de connexion à la base de données. Vérifie ta connexion.')
      },
    )
    return () => unsub()
  }, [])
}

/** Sauvegarde un client existant (merge).
 *  Utilise une transaction pour éviter de recréer un client supprimé
 *  (zombie document — ex : auto-save d'un autre onglet après suppression). */
export async function saveClient(client: Client, uid: string): Promise<void> {
  const ref = doc(db, COLLECTION, client.id)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return   // Document supprimé entre-temps — on n'écrit rien
    tx.set(ref, {
      ...client,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  })
}

/** Supprime un client */
export async function deleteClient(clientId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, clientId))
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
