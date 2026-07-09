import { collection, doc, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import { COLLECTIONS } from '@/lib/constants'
import type { Actu } from '@/types'

export async function createActu(
  titre: string,
  contenu: string,
  categorie: Actu['categorie'],
  prioritaire: boolean,
  uid: string,
  initiales: string
): Promise<string> {
  const payload = {
    titre,
    contenu,
    categorie,
    prioritaire,
    auteurUid: uid,
    auteurInitiales: initiales,
    createdAt: new Date().toISOString(),
    lectureUids: [uid], // L'auteur l'a lue par défaut
  }
  const ref = await trackWrite(addDoc(collection(db, COLLECTIONS.ACTUS), payload))
  return ref.id
}

export async function updateActu(
  id: string,
  titre: string,
  contenu: string,
  categorie: Actu['categorie'],
  prioritaire: boolean
): Promise<void> {
  const ref = doc(db, COLLECTIONS.ACTUS, id)
  await trackWrite(updateDoc(ref, {
    titre,
    contenu,
    categorie,
    prioritaire,
    updatedAt: new Date().toISOString(),
  }))
}

export async function deleteActu(id: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.ACTUS, id)
  await trackWrite(deleteDoc(ref))
}

export async function markActuAsRead(id: string, uid: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.ACTUS, id)
  await trackWrite(updateDoc(ref, {
    lectureUids: arrayUnion(uid),
  }))
}

export async function markActuAsUnread(id: string, uid: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.ACTUS, id)
  await trackWrite(updateDoc(ref, {
    lectureUids: arrayRemove(uid),
  }))
}
