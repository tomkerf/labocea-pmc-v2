import { useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useMissionsStore } from '@/stores/missionsStore'
import { toast } from '@/stores/toastStore'
import type { Client } from '@/types'

const COLLECTION = 'clients-v2'

export function useClientsListener() {
  const { setClients, setError } = useMissionsStore()

  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy('nom'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const clients = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client))
        setClients(clients)
      },
      (err) => {
        setError(err.message)
        toast.error('Erreur de connexion à la base de données. Vérifie ta connexion.')
      },
    )
    return () => unsub()
  }, [setClients, setError])
}
