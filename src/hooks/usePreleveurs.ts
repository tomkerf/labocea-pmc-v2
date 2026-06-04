import { useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { usePreleveursStore, type Preleveur } from '@/stores/preleveursStore'
import { COLLECTIONS } from '@/lib/constants'


export function usePreleveursListener() {
  const { setPreleveurs } = usePreleveursStore()

  useEffect(() => {
    const unsub = onSnapshot(doc(db, COLLECTIONS.PRELEVEURS, 'data'), (snap) => {
      const list = (snap.data()?.list ?? []) as Preleveur[]
      setPreleveurs(list.toSorted((a, b) => a.code.localeCompare(b.code)))
    })
    return () => unsub()
  }, [setPreleveurs])
}
