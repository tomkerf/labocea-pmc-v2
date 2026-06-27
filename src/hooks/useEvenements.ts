import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useEvenementsStore } from '@/stores/evenementsStore'
import type { EvenementPersonnel } from '@/types'
import { COLLECTIONS } from '@/lib/constants'


export function useEvenementsListener() {
  const { setEvenements } = useEvenementsStore()

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.EVENEMENTS), orderBy('date'), limit(500))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvenementPersonnel))
      setEvenements(data)
    })
    return () => unsub()
  }, [setEvenements])
}
