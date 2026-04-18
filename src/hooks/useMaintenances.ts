import { useEffect } from 'react'
import {
  collection, onSnapshot, doc, setDoc, addDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
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

export async function saveMaintenance(maintenance: Maintenance, uid: string): Promise<void> {
  const ref = doc(db, 'maintenances', maintenance.id)
  await setDoc(ref, { ...maintenance, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true })
}

export async function createMaintenance(uid: string, technicienNom: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const ref = await addDoc(collection(db, 'maintenances'), {
    equipementId: '',
    equipementNom: '',
    type: 'preventive',
    statut: 'planifiee',
    datePrevue: today,
    dateRealisee: null,
    dureeHeures: null,
    description: '',
    travauxRealises: '',
    piecesRemplacees: '',
    technicienUid: uid,
    technicienNom,
    cout: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}
