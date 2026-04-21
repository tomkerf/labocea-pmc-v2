import { useEffect } from 'react'
import {
  collection, onSnapshot, doc,
  setDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useDemandesStore } from '@/stores/demandesStore'
import type { Demande } from '@/types'

const COLLECTION = 'demandes'

export function useDemandesListener() {
  const { setDemandes } = useDemandesStore()

  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy('dateReception', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setDemandes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Demande)))
    })
    return () => unsub()
  }, [setDemandes])
}

export async function saveDemande(demande: Demande, uid: string): Promise<void> {
  await setDoc(doc(db, COLLECTION, demande.id), {
    ...demande,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function createDemande(
  partial: Omit<Demande, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>,
  uid: string,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...partial,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteDemande(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}
