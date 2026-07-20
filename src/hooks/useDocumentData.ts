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
}

export interface UseDocumentDataReturn<T> {
  data: T | null
  loading: boolean
  saving: boolean
  confirmDelete: boolean
  triggerSave: (updated: T) => void
  requestDelete: () => void
  handleDelete: () => Promise<void>
  cancelDelete: () => void
}

export function useDocumentData<T extends { id: string }>(
  options: UseDocumentDataOptions<T>,
): UseDocumentDataReturn<T> {
  const { collection, docId, saveFn, onAfterSave, deleteRedirect } = options

  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirty = useRef(false)

  useEffect(() => {
    if (!docId) return
    const ref = doc(db, collection, docId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const newData = { id: snap.id, ...snap.data() } as T
        if (isDirty.current) {
          const remoteUid = (snap.data().updatedBy ?? '') as string
          if (remoteUid && remoteUid !== uid) {
            setData(newData) // Un autre utilisateur a modifié, on écrase (pourrait être amélioré avec un conflit)
          }
          // Si c'est nous (remoteUid === uid), on ignore pour ne pas écraser les frappes en cours
        } else {
          setData(newData)
        }
      } else {
        setData(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [collection, docId, uid])

  function triggerSave(updated: T) {
    isDirty.current = true
    setData(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) {
        saveTimer.current = null
        return
      }
      saveTimer.current = null
      setSaving(true)
      try {
        await saveFn(updated, uid)
        await onAfterSave?.(updated)
        if (!saveTimer.current) {
          isDirty.current = false
        }
      } catch {
        toast.error('Échec de la sauvegarde. Vérifie ta connexion.')
      } finally {
        setSaving(false)
      }
    }, DEBOUNCE)
  }

  function requestDelete() { setConfirmDelete(true) }
  function cancelDelete() { setConfirmDelete(false) }

  async function handleDelete() {
    if (!docId) return
    setConfirmDelete(false)
    try {
      await deleteDoc(doc(db, collection, docId))
      navigate(deleteRedirect)
    } catch {
      toast.error('Échec de la suppression. Réessaie.')
    }
  }

  return { data, loading, saving, confirmDelete, triggerSave, requestDelete, handleDelete, cancelDelete }
}
