import { useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useEvenementsStore } from '@/stores/evenementsStore'
import type { EvenementPersonnel, TypeEvenement } from '@/types'

export function useEvenementsListener() {
  const { setEvenements } = useEvenementsStore()

  useEffect(() => {
    const q = query(collection(db, 'evenements'), orderBy('date'))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvenementPersonnel))
      setEvenements(data)
    })
    return () => unsub()
  }, [setEvenements])
}

export async function createEvenement(
  titre: string,
  date: string,
  type: TypeEvenement,
  heure: string,
  notes: string,
  uid: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'evenements'), {
    titre,
    date,
    type,
    heure: heure || null,
    notes: notes || null,
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteEvenement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'evenements', id))
}
