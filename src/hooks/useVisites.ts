import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { VisitePreliminaire } from '@/types'

export function useVisites(linkedId: string) {
  const [visites, setVisites] = useState<VisitePreliminaire[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!linkedId) {
      setLoading(false)
      return
    }
    const q = query(
      collection(db, 'visites'),
      where('linkedTo.id', '==', linkedId),
      orderBy('date', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setVisites(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VisitePreliminaire)))
      setLoading(false)
    })
    return () => unsub()
  }, [linkedId])

  return { visites, loading }
}
