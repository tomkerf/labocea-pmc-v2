import { useEffect, useRef, useState, useReducer, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveClient, deleteClient } from '@/services/clientService'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import { toast } from '@/stores/toastStore'
import type { Client } from '@/types'
import { COLLECTIONS } from '@/lib/constants'


const DEBOUNCE = 800

type SyncState = { client: Client | null; loading: boolean; remoteChanged: { byName: string } | null }
type SyncAction =
  | { type: 'LOADED'; client: Client | null }
  | { type: 'REMOTE_CHANGED'; client: Client; byName: string }
  | { type: 'RELOAD'; client: Client | null }
  | { type: 'DISMISS_REMOTE' }
  | { type: 'SET_CLIENT'; client: Client }

function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case 'LOADED':          return { client: action.client, loading: false, remoteChanged: null }
    case 'REMOTE_CHANGED':  return { ...state, loading: false, remoteChanged: { byName: action.byName } }
    case 'RELOAD':          return { client: action.client, loading: false, remoteChanged: null }
    case 'DISMISS_REMOTE':  return { ...state, remoteChanged: null }
    case 'SET_CLIENT':      return { ...state, client: action.client }
  }
}

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
  isDirtyRef: RefObject<boolean>
}

export function useClientData(clientId: string | undefined): UseClientDataReturn {
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)

  const [{ client, loading, remoteChanged }, dispatch] = useReducer(syncReducer, { client: null, loading: true, remoteChanged: null })
  const [saving, setSaving] = useState(false)

  const remoteDataRef = useRef<Client | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirty = useRef(false)
  const isDeleted = useRef(false)
  const savingPromise = useRef<Promise<void> | null>(null)

  useEffect(() => {
    if (!clientId) return
    const ref = doc(db, COLLECTIONS.CLIENTS, clientId)
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { dispatch({ type: 'LOADED', client: null }); return }
      const data = { id: snap.id, ...snap.data() } as Client
      if (isDirty.current) {
        const remoteUid = (snap.data().updatedBy ?? '') as string
        if (remoteUid && remoteUid !== uid) {
          // Conflit : un autre utilisateur a écrit pendant qu'on éditait.
          // On annule la sauvegarde auto en attente pour ne pas écraser sa modif ;
          // l'utilisateur tranche via le bandeau (recharger ou continuer).
          if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
          remoteDataRef.current = data
          const remoteUser = useUsersStore.getState().users.find(u => u.uid === remoteUid)
          dispatch({ type: 'REMOTE_CHANGED', client: data, byName: remoteUser?.prenom ?? 'un autre utilisateur' })
        }
        // Si c'est notre propre mise à jour qui nous revient en écho (remoteUid === uid),
        // on l'ignore silencieusement pour ne pas écraser les frappes en cours.
      } else {
        dispatch({ type: 'LOADED', client: data })
      }
    })
    return () => unsub()
  }, [clientId, uid])

  function triggerSave(updated: Client) {
    isDirty.current = true
    dispatch({ type: 'SET_CLIENT', client: updated })
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
          if (!saveTimer.current) isDirty.current = false
        } catch {
          toast.error('Échec de la sauvegarde. Vérifie ta connexion.')
        } finally {
          setSaving(false)
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
    const reloadedClient = remoteDataRef.current ?? client
    remoteDataRef.current = null
    dispatch({ type: 'RELOAD', client: reloadedClient })
  }

  function dismissRemoteChanged() {
    dispatch({ type: 'DISMISS_REMOTE' })
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
    isDirtyRef: isDirty,
  }
}
