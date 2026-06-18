import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import type { Maintenance } from '@/types'
import { COLLECTIONS } from '@/lib/constants'


export function useMaintenancesListener() {
  const { setMaintenances, setError } = useMaintenancesStore()

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.MAINTENANCES), orderBy('datePrevue', 'desc'), limit(200))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const maintenances = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Maintenance))
        setMaintenances(maintenances)
      },
      (err) => setError(err.message),
    )
    return () => unsub()
  }, [setMaintenances, setError])
}
