import {
  collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { trackWrite } from '@/lib/trackWrite'
import { COLLECTIONS } from '@/lib/constants'
import type { BilanRejet, PointRejet } from '@/types'

const COLLECTION = COLLECTIONS.POINTS_REJET

export async function createPointRejet(nom: string, code: string, uid: string): Promise<string> {
  const ref = await trackWrite(addDoc(collection(db, COLLECTION), {
    nom,
    code,
    bilans: [],
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  return ref.id
}

export async function updatePointRejet(
  id: string,
  data: Partial<Pick<PointRejet, 'nom' | 'code' | 'bilans'>>,
  uid: string,
): Promise<void> {
  await trackWrite(updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  }))
}

export async function deletePointRejet(id: string): Promise<void> {
  await trackWrite(deleteDoc(doc(db, COLLECTION, id)))
}

export interface ImportResult {
  created: number   // nouveaux points créés
  updated: number   // points existants enrichis
  added: number     // bilans réellement ajoutés (doublons par date ignorés)
}

/**
 * Upsert par nom de point. Les bilans en doublon (même point + même date) sont ignorés.
 */
export async function importBilans(
  parsedRows: { point: string; bilan: BilanRejet }[],
  existing: PointRejet[],
  uid: string,
): Promise<ImportResult> {
  const byName = new Map<string, BilanRejet[]>()
  for (const r of parsedRows) {
    const arr = byName.get(r.point) ?? []
    arr.push(r.bilan)
    byName.set(r.point, arr)
  }

  const batch = writeBatch(db)
  let created = 0, updated = 0, added = 0

  for (const [nom, newBilans] of byName) {
    const match = existing.find((p) => p.nom.trim().toLowerCase() === nom.trim().toLowerCase())
    if (match) {
      const dates = new Set(match.bilans.map((b) => b.date))
      const toAdd = newBilans.filter((b) => !dates.has(b.date))
      if (toAdd.length === 0) continue
      added += toAdd.length
      updated++
      batch.update(doc(db, COLLECTION, match.id), {
        bilans: [...match.bilans, ...toAdd],
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      })
    } else {
      const seen = new Set<string>()
      const deduped = newBilans.filter((b) => (seen.has(b.date) ? false : (seen.add(b.date), true)))
      added += deduped.length
      created++
      batch.set(doc(collection(db, COLLECTION)), {
        nom,
        code: '',
        bilans: deduped,
        createdBy: uid,
        updatedBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }

  await trackWrite(batch.commit())
  return { created, updated, added }
}
