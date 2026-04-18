import { useEffect } from 'react'
import {
  collection, onSnapshot, doc, setDoc, addDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useMetrologieStore } from '@/stores/metrologieStore'
import type { Verification } from '@/types'

export function useVerificationsListener() {
  const { setVerifications, setError } = useMetrologieStore()

  useEffect(() => {
    const q = query(collection(db, 'verifications'), orderBy('date', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const verifications = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Verification))
        setVerifications(verifications)
      },
      (err) => setError(err.message),
    )
    return () => unsub()
  }, [setVerifications, setError])
}

export async function saveVerification(verification: Verification, uid: string): Promise<void> {
  const ref = doc(db, 'verifications', verification.id)
  await setDoc(ref, { ...verification, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true })
}

export async function createVerification(uid: string, technicienNom: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const ref = await addDoc(collection(db, 'verifications'), {
    equipementId: '',
    equipementNom: '',
    type: 'etalonnage_interne',
    date: today,
    resultat: 'conforme',
    remarques: '',
    prochainControle: '',
    technicienUid: uid,
    technicienNom,
    documentUrl: '',
    createdAt: serverTimestamp(),
  })
  return ref.id
}
