import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { usePointsRejetStore } from '@/stores/pointsRejetStore'
import { COLLECTIONS } from '@/lib/constants'
import type { PointRejet } from '@/types'

export function usePointsRejetListener() {
  const setPointsRejet = usePointsRejetStore((s) => s.setPointsRejet)
  const setError = usePointsRejetStore((s) => s.setError)

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.POINTS_REJET), orderBy('nom'))
    const unsub = onSnapshot(
      q,
      (snap) => setPointsRejet(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PointRejet))),
      (err) => setError(err.message),
    )
    return () => unsub()
  }, [setPointsRejet, setError])
}
