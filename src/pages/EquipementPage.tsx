import { useEffect, useReducer, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2, AlertTriangle, ChevronDown } from 'lucide-react'
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveEquipement } from '@/services/equipementService'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { saveVerification } from '@/services/verificationService'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useUsersListener } from '@/hooks/useUsers'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useAuthStore, selectUid, selectInitiales } from '@/stores/authStore'
import CircleProgress from '@/components/materiel/CircleProgress'
import { ETAT_CONFIG } from '@/components/materiel/EquipementCard'
import { StatusChangeModal } from '@/components/materiel/StatusChangeModal'
import { EquipementForm } from '@/components/equipement/EquipementForm'
import { FicheDeVie } from '@/components/equipement/FicheDeVie'
import type { Equipement } from '@/types'
import { COLLECTIONS, COLORS } from '@/lib/constants'
import { useToastStore } from '@/stores/toastStore'


const DEBOUNCE = 800

// --- useReducer ---

type State = {
  equipement: Equipement | null
  loading: boolean
  saving: boolean
  confirmDelete: boolean
}

type Action =
  | { type: 'SET_EQUIPEMENT'; payload: Equipement | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_CONFIRM_DELETE'; payload: boolean }

const initialState: State = {
  equipement: null,
  loading: true,
  saving: false,
  confirmDelete: false,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_EQUIPEMENT':    return { ...state, equipement: action.payload }
    case 'SET_LOADING':       return { ...state, loading: action.payload }
    case 'SET_SAVING':        return { ...state, saving: action.payload }
    case 'SET_CONFIRM_DELETE': return { ...state, confirmDelete: action.payload }
  }
}

function calcMetroPercent(prochainEtalonnage: string): number | null {
  if (!prochainEtalonnage) return null
  const now = Date.now()
  const next = new Date(prochainEtalonnage).getTime()
  if (next <= now) return 0
  return Math.min(100, Math.round(((next - now) / (365 * 24 * 60 * 60 * 1000)) * 100))
}

export default function EquipementPage() {
  const { equipementId } = useParams<{ equipementId: string }>()
  const navigate = useNavigate()
  const uid       = useAuthStore(selectUid)
  const initiales = useAuthStore(selectInitiales)
  const { add: addToast } = useToastStore()

  useVerificationsListener()
  useMaintenancesListener()
  useUsersListener()
  const verifications = useMetrologieStore((s) => s.verifications)
  const maintenances  = useMaintenancesStore((s) => s.maintenances)

  const [state, dispatch] = useReducer(reducer, initialState)
  const { equipement, loading, saving, confirmDelete } = state
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pendingEtat, setPendingEtat] = useState<string | null>(null)

  useEffect(() => {
    if (!equipementId) return
    const ref = doc(db, COLLECTIONS.EQUIPEMENTS, equipementId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) dispatch({ type: 'SET_EQUIPEMENT', payload: { id: snap.id, ...snap.data() } as Equipement })
      else dispatch({ type: 'SET_EQUIPEMENT', payload: null })
      dispatch({ type: 'SET_LOADING', payload: false })
    })
    return () => unsub()
  }, [equipementId])

  function triggerSave(updated: Equipement) {
    dispatch({ type: 'SET_EQUIPEMENT', payload: updated })
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) return
      dispatch({ type: 'SET_SAVING', payload: true })
      try { await saveEquipement(updated, uid) }
      catch { addToast('error', 'Erreur lors de la sauvegarde') }
      finally { dispatch({ type: 'SET_SAVING', payload: false }) }
    }, DEBOUNCE)
  }

  function update(field: keyof Equipement, value: unknown) {
    if (!equipement) return
    
    if (field === 'etat' && value !== equipement.etat) {
      setPendingEtat(value as string)
      return
    }

    triggerSave({ ...equipement, [field]: value })
  }

  function handleConfirmStateChange(reason: string) {
    if (!equipement || !pendingEtat) return
    
    const newLabel = ETAT_CONFIG[pendingEtat]?.label || pendingEtat
    const note = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      titre: `Statut : ${newLabel}`,
      notes: reason.trim() || `L'état de l'équipement a été modifié vers ${newLabel}.`,
      auteur: initiales || 'Système'
    }
    
    triggerSave({ 
      ...equipement, 
      etat: pendingEtat as any,
      ficheDeVieNotes: [...(equipement.ficheDeVieNotes || []), note]
    })
    
    setPendingEtat(null)
  }

  async function handleDelete() {
    if (!equipementId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await deleteDoc(doc(db, COLLECTIONS.EQUIPEMENTS, equipementId))
    navigate('/materiel')
  }

  const [nowMs] = useState(() => Date.now())

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="size-6 rounded-full border-2 animate-spin"
        style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
    </div>
  )
  if (!equipement) return (
    <div className="p-6 text-sm" style={{ color: COLORS.DANGER }}>Équipement introuvable.</div>
  )

  const metroPercent = calcMetroPercent(equipement.prochainEtalonnage)
  const etatCfg = ETAT_CONFIG[equipement.etat] ?? ETAT_CONFIG.operationnel
  const isMetroOverdue = equipement.prochainEtalonnage
    ? new Date(equipement.prochainEtalonnage).getTime() < nowMs
    : false
  const metroOverdueDays = isMetroOverdue
    ? Math.floor((nowMs - new Date(equipement.prochainEtalonnage).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="p-6 max-w-2xl">
      <button type="button" onClick={() => navigate('/materiel')}
        className="flex items-center gap-1 text-sm mb-6" style={{ color: COLORS.ACCENT }}>
        <ChevronLeft size={16} /> Matériel
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="flex items-center gap-4">
          {metroPercent !== null ? (
            <CircleProgress percent={metroPercent} size={64} strokeWidth={4} label="métrologie" />
          ) : (
            <div className="size-16 rounded-full flex items-center justify-center"
              style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>—</span>
            </div>
          )}
          <div>
            <div className="flex items-center flex-wrap gap-3">
              <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                {equipement.nom || 'Nouvel équipement'}
              </h1>
              <div className="relative group cursor-pointer" title="Modifier l'état">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 transition-opacity group-hover:opacity-80"
                  style={{ background: etatCfg.bg, color: etatCfg.color }}>
                  {etatCfg.label}
                  <ChevronDown size={14} strokeWidth={2.5} />
                </span>
                <select
                  value={equipement.etat}
                  onChange={(e) => update('etat', e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  aria-label="Modifier l'état"
                >
                  <option value="operationnel">Opérationnel</option>
                  <option value="en_maintenance">En maintenance</option>
                  <option value="hors_service">Hors service</option>
                  <option value="prete">Prêté</option>
                </select>
              </div>
            </div>
            <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
              {[equipement.marque, equipement.modele].filter(Boolean).join(' ') || '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {saving && <span className="text-xs mr-1" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => { dispatch({ type: 'SET_CONFIRM_DELETE', payload: false }); handleDelete() }}
                className="text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: COLORS.DANGER, color: 'white' }}>
                Supprimer
              </button>
              <button type="button" onClick={() => dispatch({ type: 'SET_CONFIRM_DELETE', payload: false })}
                className="text-sm px-2 py-1.5 rounded-lg"
                style={{ color: COLORS.TEXT_SECONDARY }}>
                Annuler
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => dispatch({ type: 'SET_CONFIRM_DELETE', payload: true })} className="p-2 rounded-lg transition-colors"
              style={{ color: COLORS.DANGER, background: 'var(--color-danger-light)' }} title="Supprimer">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {isMetroOverdue && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
          style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
          <AlertTriangle size={16} style={{ color: COLORS.DANGER, flexShrink: 0 }} />
          <p className="text-sm font-medium" style={{ color: COLORS.DANGER }}>
            Étalonnage en retard de {metroOverdueDays} jour{metroOverdueDays > 1 ? 's' : ''}
            {' '}— prévu le {new Date(equipement.prochainEtalonnage).toLocaleDateString('fr-FR')}
          </p>
        </div>
      )}

      <EquipementForm equipement={equipement} update={update} />

      <StatusChangeModal
        key={pendingEtat ?? 'closed'}
        isOpen={pendingEtat !== null}
        onClose={() => setPendingEtat(null)}
        onConfirm={handleConfirmStateChange}
        newLabel={pendingEtat ? (ETAT_CONFIG[pendingEtat]?.label || pendingEtat) : ''}
      />

      <FicheDeVie
        equipement={equipement}
        verifications={verifications.filter((v) => v.equipementId === equipementId)}
        maintenances={maintenances.filter((m) => m.equipementId === equipementId)}
        onAddNote={(note) => update('ficheDeVieNotes', [...(equipement.ficheDeVieNotes ?? []), note])}
        onUpdateNote={(id, updatedNote) => update('ficheDeVieNotes', (equipement.ficheDeVieNotes ?? []).map((n) => n.id === id ? updatedNote : n))}
        onDeleteNote={(id) => update('ficheDeVieNotes', (equipement.ficheDeVieNotes ?? []).filter((n) => n.id !== id))}
        onAddVerification={async (verif) => { 
          if (uid) {
            await saveVerification(verif, uid)
            if (verif.prochainControle) {
              update('prochainEtalonnage', verif.prochainControle)
            }
          }
        }}
        initiales={initiales}
        uid={uid ?? ''}
        equipementId={equipementId!}
        equipementNom={equipement.nom}
      />
    </div>
  )
}
