import { useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { usePreleveursStore, type Preleveur } from '@/stores/preleveursStore'

export function usePreleveursListener() {
  const { setPreleveurs } = usePreleveursStore()

  useEffect(() => {
    // Lecture de la collection V1 "preleveurs"
    const unsub = onSnapshot(collection(db, 'preleveurs'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Preleveur))
      setPreleveurs(data.sort((a, b) => a.code.localeCompare(b.code)))
    })
    return () => unsub()
  }, [setPreleveurs])
}
