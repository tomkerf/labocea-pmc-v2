import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useActusStore } from '@/stores/actusStore'
import type { Actu } from '@/types'
import { COLLECTIONS } from '@/lib/constants'

export function useActusListener() {
  const { setActus, setError, setLoading } = useActusStore()

  useEffect(() => {
    setLoading(true)
    const q = query(
      collection(db, COLLECTIONS.ACTUS),
      orderBy('createdAt', 'desc'),
      limit(100)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const actus = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Actu))
        setActus(actus)
      },
      (err) => {
        console.error('[useActusListener] Firestore error:', err)
        setError(err.message)
      }
    )

    return () => unsub()
  }, [setActus, setError, setLoading])
}
