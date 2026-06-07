import { useEffect } from 'react'
import {
  collection, onSnapshot, doc, setDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTuyauxStore } from '@/stores/tuyauxStore'
import type { Tuyau } from '@/types'
import { COLLECTIONS } from '@/lib/constants'


export function useTuyauxListener() {
  const { setTuyaux, setError } = useTuyauxStore()

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.TUYAUX), orderBy('annee', 'desc'))
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
  const ref = doc(db, COLLECTIONS.TUYAUX, tuyau.id)
  await setDoc(ref, { ...tuyau, updatedAt: serverTimestamp(), createdBy: uid }, { merge: true })
}


export async function deleteTuyau(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.TUYAUX, id))
}
