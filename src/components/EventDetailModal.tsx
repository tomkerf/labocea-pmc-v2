import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, ChevronRight, X, Trash2, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import type { EvenementPersonnel } from '@/types'
import { COLORS } from '@/lib/constants'

// ── Types exportés ───────────────────────────────────────────

export interface TechOption { code: string; label: string }

/** Sous-ensemble de PlanningEvent nécessaire à la modale */
export interface ModalEvent {
  id: string
  type: 'prelevement' | 'maintenance' | 'verification' | 'evenement'
  title: string
  subtitle: string
  statusLabel: string
  statusBg: string
  statusColor: string
  link: string
  isDone: boolean
  technicien: string
  clientId?: string
  planId?: string
  samplingId?: string
  plannedTime?: string
  evenementData?: EvenementPersonnel
}

interface EventDetailModalProps {
  event: ModalEvent
  dateStr: string
  onClose: () => void
  onCancel: (event: ModalEvent, reason: string) => Promise<void>
  onMove: (event: ModalEvent, newDate: string, reason: string) => Promise<void>
  onDelete: (event: ModalEvent) => void
  onChangeTech: (event: ModalEvent, initiales: string) => Promise<void>
  techOptions: TechOption[]
}

export function EventDetailModal({
  event, dateStr, onClose, onCancel, onMove, onDelete, onChangeTech, techOptions
}: EventDetailModalProps) {
  const navigate = useNavigate()
  const connectedInitiales = useAuthStore(s => s.appUser?.initiales) ?? ''
  const [isMoving,       setIsMoving]       = useState(false)
  const [isChangingTech, setIsChangingTech] = useState(false)
  const [isCanceling,    setIsCanceling]    = useState(false)
  const [moveDate,       setMoveDate]       = useState(dateStr)
  const [moveReason,     setMoveReason]     = useState('')
  const [cancelReason,   setCancelReason]   = useState('')
  const [techInitiales,  setTechInitiales]  = useState(event.technicien ?? '')
  const [saving,         setSaving]         = useState(false)

  const isPrelev = event.type === 'prelevement'
  const isEvt    = event.type === 'evenement'

  const dateLabel = new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  async function handleMove() {
    if (!moveDate || !moveReason.trim() || saving) return
    setSaving(true)
    try { await onMove(event, moveDate, moveReason.trim()); onClose() }
    finally { setSaving(false) }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return  // motif obligatoire
    setSaving(true)
    try { await onCancel(event, cancelReason.trim()); onClose() }
    finally { setSaving(false) }
  }

  async function handleChangeTech() {
    if (!techInitiales || saving) return
    setSaving(true)
    try { await onChangeTech(event, techInitiales); setIsChangingTech(false) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
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
              <label htmlFor="edm-move-date" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                Nouvelle date
              </label>
              <input id="edm-move-date" type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }} />
            </div>
            <div>
              <label htmlFor="edm-move-reason" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                Motif du report <span style={{ color: COLORS.DANGER }}>*</span>
              </label>
              <textarea
                id="edm-move-reason"
                value={moveReason} onChange={e => setMoveReason(e.target.value)}
                placeholder="Ex : météo défavorable, client indisponible…"
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }} />
            </div>
            <button type="button" onClick={handleMove} disabled={!moveDate || !moveReason.trim() || saving}
              className="px-4 py-2 rounded-lg text-sm font-medium self-end"
              style={{ background: COLORS.ACCENT, color: 'white', opacity: (!moveDate || !moveReason.trim() || saving) ? 0.5 : 1 }}>
              {saving ? '…' : 'Déplacer'}
            </button>
          </div>
        )}

        {/* Panneau changer technicien */}
        {isChangingTech && (
          <div className="px-5 py-3.5 flex items-end gap-3"
            style={{ background: COLORS.BG_TERTIARY, borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="flex-1">
              <label htmlFor="edm-tech" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                Technicien assigné
              </label>
              <select id="edm-tech" value={techInitiales} onChange={e => setTechInitiales(e.target.value)} autoFocus
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

        {/* Panneau retirer du calendrier */}
        {isCanceling && (
          <div className="px-5 py-3.5 flex flex-col gap-2.5"
            style={{ background: 'var(--color-danger-light)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div>
              <label htmlFor="edm-cancel-reason" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.DANGER }}>
                Motif du retrait <span style={{ color: COLORS.DANGER }}>*</span>
              </label>
              <textarea
                id="edm-cancel-reason"
                value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="Ex : reporté à une date ultérieure, annulé par le client…"
                rows={2}
                autoFocus
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
            
            <button type="button" onClick={handleCancel} disabled={saving || !cancelReason.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium self-end mt-1"
              style={{ background: COLORS.DANGER, color: 'white', opacity: (saving || !cancelReason.trim()) ? 0.5 : 1 }}>
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
               'Voir la métrologie'}
            </button>
          )}

          {isPrelev && !event.isDone && (
            <button type="button" onClick={() => { setIsMoving(v => !v); setIsChangingTech(false); setIsCanceling(false); }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isMoving ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Déplacer à une autre date
            </button>
          )}

          {isPrelev && (
            <button type="button" onClick={() => { setIsChangingTech(v => !v); setIsMoving(false); setIsCanceling(false); }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY, border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isChangingTech ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Changer le technicien
            </button>
          )}

          {isPrelev && !event.isDone && (
            <button type="button" onClick={() => { setIsCanceling(v => !v); setIsMoving(false); setIsChangingTech(false); }}
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
