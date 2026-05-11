import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import type { Maintenance } from '@/types'

export function useMaintenancesListener() {
  const { setMaintenances, setError } = useMaintenancesStore()

  useEffect(() => {
    const q = query(collection(db, 'maintenances'), orderBy('datePrevue', 'desc'))
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
