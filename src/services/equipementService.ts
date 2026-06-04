import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import type { Equipement } from '@/types'
import { COLLECTIONS } from '@/lib/constants'


export async function saveEquipement(equipement: Equipement, uid: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.EQUIPEMENTS, equipement.id)
  await trackWrite(setDoc(ref, { ...equipement, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true }))
}

export async function createEquipement(uid: string): Promise<string> {
  const now = new Date().toISOString().split('T')[0]
  const ref = await trackWrite(addDoc(collection(db, COLLECTIONS.EQUIPEMENTS), {
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
  }))
  return ref.id
}
