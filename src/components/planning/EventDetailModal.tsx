import { useState, useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ExternalLink, Trash2, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import type { PlanningEvent, TechOption } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { modalReducer } from './eventDetailModalReducer'
import EventDetailMovePanel from './EventDetailMovePanel'
import EventDetailTechPanel from './EventDetailTechPanel'
import EventDetailEquipPanel from './EventDetailEquipPanel'
import EventDetailCancelPanel from './EventDetailCancelPanel'

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

const EMPTY_ITEMS: string[] = []

export default function EventDetailModal({
  event, dateStr, assignedEqIdsForDate = EMPTY_ITEMS, onClose, onCancel, onMove, onDelete, onChangeTech, onChangeEquipements, techOptions,
}: EventDetailModalProps) {
  const navigate = useNavigate()
  const connectedInitiales = useAuthStore(s => s.appUser?.initiales) ?? ''
  const { equipements } = useEquipementsStore()

  const [state, dispatch] = useReducer(modalReducer, {
    activePanel: 'none',
    moveDate: dateStr,
    moveReason: '',
    cancelReason: '',
    techInitiales: event.technicien ?? '',
    equipementsAssignes: event.equipementsAssignes ?? [],
  })
  const [saving, setSaving] = useState(false)

  const { activePanel, moveDate, moveReason, cancelReason, techInitiales, equipementsAssignes } = state
  const isMoving       = activePanel === 'moving'
  const isChangingTech = activePanel === 'changingTech'
  const isCanceling    = activePanel === 'canceling'
  const isChangingEq   = activePanel === 'changingEquipements'

  const isPrelev   = event.type === 'prelevement'
  const isEvt      = event.type === 'evenement'
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

        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: COLORS.BORDER }} />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-4">
          <span className="size-2.5 rounded-full shrink-0 mt-1.5" style={{ background: event.statusColor }} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold leading-snug" style={{ color: COLORS.TEXT_PRIMARY }}>{event.title}</p>
            {event.subtitle && event.subtitle !== '—' && (
              <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{event.subtitle}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: event.statusBg, color: event.statusColor }}>{event.statusLabel}</span>
              {event.technicien && event.technicien !== '—' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>{event.technicien}</span>
              )}
              {event.plannedTime && (
                <span className="text-[11px] px-2 py-0.5 rounded font-semibold"
                  style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>{event.plannedTime}</span>
              )}
              {event.meteo === 'pluie' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#EFF6FF', color: '#3B82F6' }}>🌧 Temps de pluie</span>
              )}
            </div>
            <p className="text-xs mt-1.5 capitalize" style={{ color: 'var(--color-text-tertiary)' }}>{dateLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg shrink-0 mt-0.5"
            style={{ color: 'var(--color-text-tertiary)', background: COLORS.BG_TERTIARY }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

        {isMoving && (
          <EventDetailMovePanel moveDate={moveDate} moveReason={moveReason} saving={saving}
            dispatch={dispatch} onConfirm={handleMove} />
        )}
        {isChangingTech && (
          <EventDetailTechPanel techInitiales={techInitiales} techOptions={techOptions} saving={saving}
            dispatch={dispatch} onConfirm={handleChangeTech} />
        )}
        {isBilan24h && isChangingEq && (
          <EventDetailEquipPanel equipements={equipements} equipementsAssignes={equipementsAssignes}
            assignedEqIdsForDate={assignedEqIdsForDate} saving={saving}
            dispatch={dispatch} onConfirm={handleSaveEquipements} />
        )}
        {isCanceling && (
          <EventDetailCancelPanel event={event} cancelReason={cancelReason} saving={saving}
            connectedInitiales={connectedInitiales} dispatch={dispatch} onConfirm={handleCancel} />
        )}

        {/* Actions */}
        <div className="flex flex-col px-4 py-4 gap-2.5 overflow-y-auto"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>

          {event.link && (
            <button type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); const dest = event.link; onClose(); setTimeout(() => navigate(dest), 50) }}
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
                    {equipements.flatMap(eq => equipementsAssignes.includes(eq.id) ? eq.nom : []).join(', ')}
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
