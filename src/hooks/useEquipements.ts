import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useEquipementsStore } from '@/stores/equipementsStore'
import type { Equipement } from '@/types'

export function useEquipementsListener() {
  const { setEquipements, setError } = useEquipementsStore()

  useEffect(() => {
    const q = query(collection(db, 'equipements'), orderBy('nom'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const equipements = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Equipement))
        setEquipements(equipements)
      },
      (err) => setError(err.message),
    )
    return () => unsub()
  }, [setEquipements, setError])
}
