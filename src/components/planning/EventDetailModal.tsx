import { useState, useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ExternalLink, Trash2, AlertTriangle, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import type { PlanningEvent, TechOption } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { calcStatut } from '@/hooks/useMetrologieRows'

export interface EventDetailModalProps {
  event: PlanningEvent
  dateStr: string
  assignedEqIdsForDate?: string[]
  onClose: () => void
  onCancel: (event: PlanningEvent, reason: string) => Promise<void>
  onMove: (event: PlanningEvent, newDate: string, reason: string) => Promise<void>
  onDelete: (event: PlanningEvent) => void
  onChangeTech: (event: PlanningEvent, initiales: string) => Promise<void>
  onChangeEquipements: (event: PlanningEvent, eqIds: string[]) => Promise<void>
  techOptions: TechOption[]
}

// ── State types ──────────────────────────────────────────────────────────────

type ActivePanel = 'none' | 'moving' | 'changingTech' | 'canceling' | 'changingEquipements'

interface ModalState {
  // Panel visibility — mutually exclusive
  activePanel: ActivePanel
  // Form data
  moveDate: string
  moveReason: string
  cancelReason: string
  techInitiales: string
  equipementsAssignes: string[]
}

type ModalAction =
  | { type: 'TOGGLE_PANEL'; panel: Exclude<ActivePanel, 'none'> }
  | { type: 'SET_MOVE_DATE'; value: string }
  | { type: 'SET_MOVE_REASON'; value: string }
  | { type: 'SET_CANCEL_REASON'; value: string }
  | { type: 'SET_TECH_INITIALES'; value: string }
  | { type: 'TOGGLE_EQUIPEMENT'; id: string }
  | { type: 'RESET' }

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'TOGGLE_PANEL':
      return {
        ...state,
        activePanel: state.activePanel === action.panel ? 'none' : action.panel,
      }
    case 'SET_MOVE_DATE':      return { ...state, moveDate: action.value }
    case 'SET_MOVE_REASON':    return { ...state, moveReason: action.value }
    case 'SET_CANCEL_REASON':  return { ...state, cancelReason: action.value }
    case 'SET_TECH_INITIALES': return { ...state, techInitiales: action.value }
    case 'TOGGLE_EQUIPEMENT': {
      const prev = state.equipementsAssignes
      if (prev.includes(action.id)) {
        return { ...state, equipementsAssignes: prev.filter(x => x !== action.id) }
      } else {
        return { ...state, equipementsAssignes: [...prev, action.id] }
      }
    }
    case 'RESET':
      return {
        activePanel: 'none',
        moveDate: '',
        moveReason: '',
        cancelReason: '',
        techInitiales: '',
        equipementsAssignes: [],
      }
    default:
      return state
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EventDetailModal({ 
  event, dateStr, assignedEqIdsForDate = [], onClose, onCancel, onMove, onDelete, onChangeTech, onChangeEquipements, techOptions 
}: EventDetailModalProps) {
  const navigate = useNavigate()
  const connectedInitiales = useAuthStore(s => s.appUser?.initiales) ?? ''

  const [state, dispatch] = useReducer(modalReducer, {
    activePanel: 'none',
    moveDate: dateStr,
    moveReason: '',
    cancelReason: '',
    techInitiales: event.technicien ?? '',
    equipementsAssignes: event.equipementsAssignes ?? [],
  })
  const [saving, setSaving] = useState(false)
  const { equipements } = useEquipementsStore()

  const { activePanel, moveDate, moveReason, cancelReason, techInitiales, equipementsAssignes } = state
  const isMoving       = activePanel === 'moving'
  const isChangingTech = activePanel === 'changingTech'
  const isCanceling    = activePanel === 'canceling'
  const isChangingEq   = activePanel === 'changingEquipements'

  const isPrelev = event.type === 'prelevement'
  const isEvt    = event.type === 'evenement'
  const isBilan24h = event.methode === 'Composite' || event.methode === 'Automatique'

  const dateLabel = new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  async function handleMove() {
    if (!moveDate || saving) return
    setSaving(true)
    try { await onMove(event, moveDate, moveReason.trim()); onClose() }
    finally { setSaving(false) }
  }

  async function handleCancel() {
    setSaving(true)
    try { await onCancel(event, cancelReason.trim()); onClose() }
    finally { setSaving(false) }
  }

  async function handleChangeTech() {
    if (!techInitiales || saving) return
    setSaving(true)
    try { await onChangeTech(event, techInitiales); dispatch({ type: 'TOGGLE_PANEL', panel: 'changingTech' }) }
    finally { setSaving(false) }
  }

  async function handleSaveEquipements() {
    if (saving) return
    setSaving(true)
    try { await onChangeEquipements(event, equipementsAssignes); dispatch({ type: 'TOGGLE_PANEL', panel: 'changingEquipements' }) }
    finally { setSaving(false) }
  }

  return (
    <div role="presentation" className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full md:max-w-sm flex flex-col rounded-t-[20px] md:rounded-2xl"
        style={{ background: COLORS.BG_SECONDARY, boxShadow: 'var(--shadow-modal)', maxHeight: '90dvh', overflow: 'hidden' }}>

        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: COLORS.BORDER }} />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-4">
          <span className="size-2.5 rounded-full shrink-0 mt-1.5" style={{ background: event.statusColor }} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold leading-snug" style={{ color: COLORS.TEXT_PRIMARY }}>
              {event.title}
            </p>
            {event.subtitle && event.subtitle !== '—' && (
              <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                {event.subtitle}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: event.statusBg, color: event.statusColor }}>
                {event.statusLabel}
              </span>
              {event.technicien && event.technicien !== '—' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
                  {event.technicien}
                </span>
              )}
              {event.plannedTime && (
                <span className="text-[11px] px-2 py-0.5 rounded font-semibold"
                  style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
                  {event.plannedTime}
                </span>
              )}
              {event.meteo === 'pluie' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                  🌧 Temps de pluie
                </span>
              )}
            </div>
            <p className="text-xs mt-1.5 capitalize" style={{ color: 'var(--color-text-tertiary)' }}>
              {dateLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg shrink-0 mt-0.5"
            style={{ color: 'var(--color-text-tertiary)', background: COLORS.BG_TERTIARY }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

        {/* Panneau déplacer */}
        {isMoving && (
          <div className="px-5 py-3.5 flex flex-col gap-2.5"
            style={{ background: COLORS.BG_TERTIARY, borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div>
              <label htmlFor="pedm-move-date" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                Nouvelle date
              </label>
              <input id="pedm-move-date" type="date" value={moveDate} onChange={e => dispatch({ type: 'SET_MOVE_DATE', value: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }} />
            </div>
            <div>
              <label htmlFor="pedm-move-reason" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                Motif du report <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <textarea
                id="pedm-move-reason"
                value={moveReason} onChange={e => dispatch({ type: 'SET_MOVE_REASON', value: e.target.value })}
                placeholder="Ex : météo défavorable, client indisponible…"
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }} />
            </div>
            <button type="button" onClick={handleMove} disabled={!moveDate || saving}
              className="px-4 py-2 rounded-lg text-sm font-medium self-end"
              style={{ background: COLORS.ACCENT, color: 'white', opacity: (!moveDate || saving) ? 0.5 : 1 }}>
              {saving ? '…' : 'Déplacer'}
            </button>
          </div>
        )}

        {/* Panneau changer technicien */}
        {isChangingTech && (
          <div className="px-5 py-3.5 flex items-end gap-3"
            style={{ background: COLORS.BG_TERTIARY, borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="flex-1">
              <label htmlFor="pedm-tech" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                Technicien assigné
              </label>
              <select
                id="pedm-tech"
                value={techInitiales}
                onChange={e => dispatch({ type: 'SET_TECH_INITIALES', value: e.target.value })}

                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }}>
                {techOptions.map(o => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={handleChangeTech} disabled={saving || !techInitiales.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: COLORS.ACCENT, color: 'white', opacity: (saving || !techInitiales.trim()) ? 0.5 : 1 }}>
              {saving ? '…' : 'Confirmer'}
            </button>
          </div>
        )}

        {/* Panneau assigner matériel (limité aux Bilans 24h) */}
        {isBilan24h && isChangingEq && (
          <div className="px-5 py-3.5 flex flex-col gap-3"
            style={{ background: COLORS.BG_TERTIARY, borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: COLORS.TEXT_SECONDARY }}>
                Matériel utilisé pour la tournée
              </label>
              <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2">
                {equipements.filter(e => e.etat !== 'hors_service' && ['preleveur', 'debitmetre', 'flacon'].includes(e.categorie)).map(eq => {
                  const isChecked = equipementsAssignes.includes(eq.id)
                  const isTaken = !isChecked && assignedEqIdsForDate.includes(eq.id)
                  const eqStatut = calcStatut(eq.prochainEtalonnage)
                  const metrologieEnRetard = eqStatut.key === 'late'
                  const enMaintenance = eq.etat === 'en_maintenance'
                  const prete = eq.etat === 'prete'

                  const hasWarning = metrologieEnRetard || enMaintenance || prete
                  const isDisabled = isTaken || hasWarning
                  
                  return (
                    <div key={eq.id} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: COLORS.BG_SECONDARY, border: `1px solid ${hasWarning ? 'rgba(255,59,48,0.3)' : 'var(--color-border-subtle)'}`, opacity: isDisabled && !isChecked ? 0.6 : 1 }}>
                      <input 
                        type="checkbox" 
                        id={`pedm-eq-${eq.id}`}
                        checked={isChecked}
                        disabled={isDisabled && !isChecked}
                        onChange={() => dispatch({ type: 'TOGGLE_EQUIPEMENT', id: eq.id })}
                        className="mt-1"
                      />
                      <label htmlFor={`pedm-eq-${eq.id}`} className="flex-1 flex flex-col cursor-pointer text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>
                        <span className="font-medium">{eq.nom}</span>
                        <span className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>{eq.marque} - {eq.numSerie}</span>
                        {hasWarning && (
                          <div className="flex items-center gap-1 mt-1 text-[11px] font-medium" style={{ color: COLORS.DANGER }}>
                            <AlertTriangle size={12} />
                            {metrologieEnRetard ? 'Métrologie expirée' : enMaintenance ? 'En maintenance' : 'Prêté'}
                          </div>
                        )}
                        {isTaken && !hasWarning && (
                          <div className="flex items-center gap-1 mt-1 text-[11px] font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>
                            <AlertTriangle size={12} />
                            Déjà assigné ce jour
                          </div>
                        )}
                      </label>
                    </div>
                  )
                })}
                {equipements.filter(e => e.etat !== 'hors_service' && ['preleveur', 'debitmetre', 'flacon'].includes(e.categorie)).length === 0 && (
                  <p className="text-sm italic" style={{ color: 'var(--color-text-tertiary)' }}>Aucun équipement disponible.</p>
                )}
              </div>
            </div>
            <button type="button" onClick={handleSaveEquipements} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium self-end"
              style={{ background: COLORS.ACCENT, color: 'white', opacity: saving ? 0.5 : 1 }}>
              {saving ? '…' : 'Enregistrer le matériel'}
            </button>
          </div>
        )}

        {/* Panneau retirer du calendrier */}
        {isCanceling && (
          <div className="px-5 py-3.5 flex flex-col gap-2.5"
            style={{ background: 'var(--color-danger-light)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div>
              <label htmlFor="pedm-cancel-reason" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.DANGER }}>
                Motif du retrait <span style={{ opacity: 0.8 }}>(optionnel)</span>
              </label>
              <textarea
                id="pedm-cancel-reason"
                value={cancelReason} onChange={e => dispatch({ type: 'SET_CANCEL_REASON', value: e.target.value })}
                placeholder="Ex : reporté à une date ultérieure, annulé par le client…"
                rows={2}

                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: COLORS.BG_SECONDARY, border: '1px solid rgba(255,59,48,0.3)', color: COLORS.TEXT_PRIMARY }} />
            </div>
            
            {event.technicien && event.technicien !== '—' && event.technicien !== connectedInitiales && (
              <div className="flex items-start gap-2 mt-1">
                <AlertTriangle size={15} style={{ color: COLORS.DANGER, flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs font-medium" style={{ color: COLORS.DANGER }}>
                  Cette intervention appartient à <strong>{event.technicien}</strong>.<br/>Es-tu sûr de vouloir la retirer ?
                </p>
              </div>
            )}
            
            <button type="button" onClick={handleCancel} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium self-end mt-1"
              style={{ background: COLORS.DANGER, color: 'white', opacity: saving ? 0.5 : 1 }}>
              {saving ? '…' : 'Confirmer le retrait'}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col px-4 py-4 gap-2.5 overflow-y-auto"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>

          {event.link && (
            <button type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const dest = event.link
                onClose()
                setTimeout(() => navigate(dest), 50)
              }}
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-[15px] font-semibold w-full mb-1"
              style={{ background: COLORS.ACCENT, color: 'white', boxShadow: '0 2px 8px rgba(0, 113, 227, 0.2)' }}>
              <ExternalLink size={16} />
              {event.type === 'prelevement' ? (event.isDone ? 'Voir la mission' : 'Ouvrir la mission (valider/annuler)') :
               event.type === 'maintenance' ? 'Voir la maintenance' :
               event.type === 'todo' ? 'Voir les tâches' :
               event.type === 'rapport' ? 'Voir le plan' :
               'Voir la métrologie'}
            </button>
          )}

          {isPrelev && !event.isDone && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'moving' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isMoving ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Déplacer à une autre date
            </button>
          )}

          {isPrelev && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'changingTech' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isChangingTech ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Changer le technicien
            </button>
          )}

          {isPrelev && isBilan24h && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'changingEquipements' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isChangingEq ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }} />
              <div className="flex-1 overflow-hidden">
                <div>Assigner du matériel</div>
                {equipementsAssignes.length > 0 && (
                  <div className="text-xs font-normal truncate mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {equipements.filter(eq => equipementsAssignes.includes(eq.id)).map(eq => eq.nom).join(', ')}
                  </div>
                )}
              </div>
            </button>
          )}

          {isPrelev && !event.isDone && (
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_PANEL', panel: 'canceling' })}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.DANGER, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isCanceling ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Retirer du calendrier
            </button>
          )}

          {isEvt && (
            <button type="button" onClick={() => { onDelete(event); onClose() }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full mt-1"
              style={{ background: 'var(--color-danger-light)', color: COLORS.DANGER }}>
              <Trash2 size={15} /> Supprimer l'événement
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
