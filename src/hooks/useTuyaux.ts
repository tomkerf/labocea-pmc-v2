import { useEffect } from 'react'
import {
  collection, onSnapshot, doc, setDoc, addDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTuyauxStore } from '@/stores/tuyauxStore'
import type { Tuyau } from '@/types'

export function useTuyauxListener() {
  const { setTuyaux, setError } = useTuyauxStore()

  useEffect(() => {
    const q = query(collection(db, 'tuyaux'), orderBy('annee', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const tuyaux = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tuyau))
        setTuyaux(tuyaux)
      },
      (err) => setError(err.message),
    )
    return () => unsub()
  }, [setTuyaux, setError])
}

export async function saveTuyau(tuyau: Tuyau, uid: string): Promise<void> {
  const ref = doc(db, 'tuyaux', tuyau.id)
  await setDoc(ref, { ...tuyau, updatedAt: serverTimestamp(), createdBy: uid }, { merge: true })
}

export async function createTuyau(uid: string): Promise<string> {
  const ref = await addDoc(collection(db, 'tuyaux'), {
    refLabo: '',
    materiau: 'TEFLON',
    annee: new Date().getFullYear(),
    objet: '',
    materiel: '',
    dateCreation: new Date().toISOString().split('T')[0],
    marque: '',
    numSerie: '',
    type: '',
    fournisseur: 'SEFI Quimper',
    notes: '',
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteTuyau(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tuyaux', id))
}
