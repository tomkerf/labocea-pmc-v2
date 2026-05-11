import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Equipement } from '@/types'

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
