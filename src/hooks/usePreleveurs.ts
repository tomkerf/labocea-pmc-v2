import { useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { usePreleveursStore, type Preleveur } from '@/stores/preleveursStore'
import { COLLECTIONS } from '@/lib/constants'
import { toast } from '@/stores/toastStore'

export function usePreleveursListener() {
  const { setPreleveurs } = usePreleveursStore()

  useEffect(() => {
    console.log('[usePreleveursListener] Subscribing to', COLLECTIONS.PRELEVEURS, 'data')
    const unsub = onSnapshot(
      doc(db, COLLECTIONS.PRELEVEURS, 'data'),
      (snap) => {
        const data = snap.data()
        console.log('[usePreleveursListener] Received snap data:', data)
        const list = (data?.list ?? []) as Preleveur[]
        setPreleveurs(list.toSorted((a, b) => a.code.localeCompare(b.code)))
      },
      (err) => {
        console.error('[usePreleveursListener] Firestore error:', err)
        toast.error(`Erreur chargement préleveurs: ${err.message}`)
      }
    )
    return () => unsub()
  }, [setPreleveurs])
}
