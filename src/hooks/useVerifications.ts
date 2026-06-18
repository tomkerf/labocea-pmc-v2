import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useMetrologieStore } from '@/stores/metrologieStore'
import type { Verification } from '@/types'
import { COLLECTIONS } from '@/lib/constants'


export function useVerificationsListener() {
  const { setVerifications, setError } = useMetrologieStore()

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.VERIFICATIONS), orderBy('date', 'desc'), limit(200))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const verifications = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Verification))
        setVerifications(verifications)
      },
      (err) => setError(err.message),
    )
    return () => unsub()
  }, [setVerifications, setError])
}
