import { useEffect } from 'react'
import {
  collection, onSnapshot, doc, setDoc, addDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
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

export async function saveEquipement(equipement: Equipement, uid: string): Promise<void> {
  const ref = doc(db, 'equipements', equipement.id)
  await setDoc(ref, { ...equipement, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true })
}

export async function createEquipement(uid: string): Promise<string> {
  const now = new Date().toISOString().split('T')[0]
  const ref = await addDoc(collection(db, 'equipements'), {
    nom: '',
    marque: '',
    modele: '',
    numSerie: '',
    categorie: 'autre',
    dateAcquisition: now,
    etat: 'operationnel',
    localisation: 'labo',
    notes: '',
    prochainEtalonnage: '',
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}
