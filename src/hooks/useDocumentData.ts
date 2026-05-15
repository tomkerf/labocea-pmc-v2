import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

const DEBOUNCE = 800

interface UseDocumentDataOptions<T> {
  collection: string
  docId: string | undefined
  saveFn: (data: T, uid: string) => Promise<void>
  onAfterSave?: (updated: T) => Promise<void>
  deleteRedirect: string
  deleteConfirmMessage: string
}

export interface UseDocumentDataReturn<T> {
  data: T | null
  loading: boolean
  saving: boolean
  triggerSave: (updated: T) => void
  handleDelete: () => Promise<void>
}

export function useDocumentData<T extends { id: string }>(
  options: UseDocumentDataOptions<T>,
): UseDocumentDataReturn<T> {
  const { collection, docId, saveFn, onAfterSave, deleteRedirect, deleteConfirmMessage } = options

  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!docId) return
    const ref = doc(db, collection, docId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setData({ id: snap.id, ...snap.data() } as T)
      else setData(null)
      setLoading(false)
    })
    return () => unsub()
  }, [collection, docId])

  function triggerSave(updated: T) {
    setData(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) return
      setSaving(true)
      try {
        await saveFn(updated, uid)
        await onAfterSave?.(updated)
      } catch {
        toast.error('Échec de la sauvegarde. Vérifie ta connexion.')
      } finally {
        setSaving(false)
      }
    }, DEBOUNCE)
  }

  async function handleDelete() {
    if (!docId) return
    if (!confirm(deleteConfirmMessage)) return
    try {
      await deleteDoc(doc(db, collection, docId))
      navigate(deleteRedirect)
    } catch {
      toast.error('Échec de la suppression. Réessaie.')
    }
  }

  return { data, loading, saving, triggerSave, handleDelete }
}
