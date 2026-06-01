import { useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { usePreleveursStore, type Preleveur } from '@/stores/preleveursStore'

export function usePreleveursListener() {
  const { setPreleveurs } = usePreleveursStore()

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'preleveurs-v1', 'data'), (snap) => {
      const list = (snap.data()?.list ?? []) as Preleveur[]
      setPreleveurs([...list].sort((a, b) => a.code.localeCompare(b.code)))
    })
    return () => unsub()
  }, [setPreleveurs])
}
