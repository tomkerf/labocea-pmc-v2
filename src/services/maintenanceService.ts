import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Maintenance } from '@/types'

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
