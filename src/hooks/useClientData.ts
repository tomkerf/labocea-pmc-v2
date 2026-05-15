import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveClient, deleteClient } from '@/services/clientService'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { toast } from '@/stores/toastStore'
import type { Client } from '@/types'

const DEBOUNCE = 800

export interface UseClientDataReturn {
  client: Client | null
  loading: boolean
  saving: boolean
  remoteChanged: { byName: string } | null
  triggerSave: (updated: Client) => void
  update: (field: keyof Client, value: unknown) => void
  handleReload: () => void
  handleDeleteClient: () => Promise<void>
  dismissRemoteChanged: () => void
}

export function useClientData(clientId: string | undefined): UseClientDataReturn {
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [remoteChanged, setRemoteChanged] = useState<{ byName: string } | null>(null)

  const remoteDataRef = useRef<Client | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirty = useRef(false)
  const isDeleted = useRef(false)
  const savingPromise = useRef<Promise<void> | null>(null)

  useEffect(() => {
    if (!clientId) return
    const ref = doc(db, 'clients-v2', clientId)
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setLoading(false); return }
      const data = { id: snap.id, ...snap.data() } as Client
      if (isDirty.current) {
        const remoteUid = (snap.data().updatedBy ?? '') as string
        if (remoteUid && remoteUid !== uid) {
          remoteDataRef.current = data
          const remoteUser = useUsersStore.getState().users.find(u => u.uid === remoteUid)
          setRemoteChanged({ byName: remoteUser?.prenom ?? 'un autre utilisateur' })
        }
      } else {
        setClient(data)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [clientId, uid])

  function triggerSave(updated: Client) {
    isDirty.current = true
    setClient(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid || isDeleted.current) {
        saveTimer.current = null
        return
      }
      saveTimer.current = null
      setSaving(true)
      const p = (async () => {
        try {
          await saveClient(updated, uid)
        } catch {
          toast.error('Échec de la sauvegarde. Vérifie ta connexion.')
        } finally {
          setSaving(false)
          if (!saveTimer.current) isDirty.current = false
        }
      })()
      savingPromise.current = p
      await p
      savingPromise.current = null
    }, DEBOUNCE)
  }

  function update(field: keyof Client, value: unknown) {
    if (!client) return
    triggerSave({ ...client, [field]: value })
  }

  function handleReload() {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    isDirty.current = false
    if (remoteDataRef.current) {
      setClient(remoteDataRef.current)
      remoteDataRef.current = null
    }
    setRemoteChanged(null)
  }

  function dismissRemoteChanged() {
    setRemoteChanged(null)
  }

  async function handleDeleteClient() {
    if (!client) return
    isDeleted.current = true
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    isDirty.current = false
    if (savingPromise.current) {
      try { await savingPromise.current } catch { /* ignore */ }
    }
    try {
      await deleteClient(client.id)
      navigate('/missions')
    } catch {
      isDeleted.current = false
      toast.error('Échec de la suppression. Réessaie.')
    }
  }

  return {
    client,
    loading,
    saving,
    remoteChanged,
    triggerSave,
    update,
    handleReload,
    handleDeleteClient,
    dismissRemoteChanged,
  }
}
