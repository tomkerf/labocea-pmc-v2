import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
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
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VisitePreliminaire))
      data.sort((a, b) => b.date.localeCompare(a.date))
      setVisites(data)
      setLoading(false)
    }, () => {
      setVisites([])
      setLoading(false)
    })
    return () => unsub()
  }, [linkedId])

  return { visites, loading }
}
