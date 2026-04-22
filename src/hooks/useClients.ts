import { useEffect } from 'react'
import {
  collection, onSnapshot, doc, getDoc,
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

/** Supprime un client et vérifie que la suppression a bien été appliquée côté serveur.
 *  Lance une erreur si le document existe encore après la suppression
 *  (ex : règles Firestore qui rejettent le deleteDoc en silence côté cache local). */
export async function deleteClient(clientId: string): Promise<void> {
  const ref = doc(db, COLLECTION, clientId)
  await deleteDoc(ref)
  // Vérification serveur : force une lecture fraîche pour confirmer la suppression
  const snap = await getDoc(ref)
  if (snap.exists()) {
    console.error('[deleteClient] Le document existe encore après deleteDoc — règles Firestore ?', clientId)
    throw new Error('La suppression a échoué côté serveur. Vérifie les règles Firestore.')
  }
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
