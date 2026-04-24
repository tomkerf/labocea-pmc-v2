import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, ChevronRight, X, Trash2, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import type { EvenementPersonnel } from '@/types'

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
  onCancel: (event: ModalEvent) => Promise<void>
  onMove: (event: ModalEvent, newDate: string) => Promise<void>
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
  const [confirmCancel,  setConfirmCancel]  = useState(false)
  const [moveDate,       setMoveDate]       = useState(dateStr)
  const [techInitiales,  setTechInitiales]  = useState(event.technicien ?? '')
  const [saving,         setSaving]         = useState(false)

  const isPrelev = event.type === 'prelevement'
  const isEvt    = event.type === 'evenement'

  const dateLabel = new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  async function handleMove() {
    if (!moveDate || saving) return
    setSaving(true)
    try { await onMove(event, moveDate); onClose() }
    finally { setSaving(false) }
  }

  async function handleCancel() {
    if (event.technicien && event.technicien !== '—' && event.technicien !== connectedInitiales && !confirmCancel) {
      setConfirmCancel(true)
      return
    }
    setSaving(true)
    setConfirmCancel(false)
    try { await onCancel(event); onClose() }
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
        style={{ background: 'var(--color-bg-secondary)', boxShadow: 'var(--shadow-modal)', maxHeight: '90dvh', overflow: 'hidden' }}>

        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-4">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: event.statusColor }} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
              {event.title}
            </p>
            {event.subtitle && event.subtitle !== '—' && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
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
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                  {event.technicien}
                </span>
              )}
              {event.plannedTime && (
                <span className="text-[11px] px-2 py-0.5 rounded font-semibold"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                  {event.plannedTime}
                </span>
              )}
            </div>
            <p className="text-xs mt-1.5 capitalize" style={{ color: 'var(--color-text-tertiary)' }}>
              {dateLabel}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg shrink-0 mt-0.5"
            style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

        {/* Panneau déplacer */}
        {isMoving && (
          <div className="px-5 py-3.5 flex items-end gap-3"
            style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Nouvelle date
              </label>
              <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
            <button onClick={handleMove} disabled={!moveDate || saving}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: 'white', opacity: (!moveDate || saving) ? 0.5 : 1 }}>
              {saving ? '…' : 'Déplacer'}
            </button>
          </div>
        )}

        {/* Panneau changer technicien */}
        {isChangingTech && (
          <div className="px-5 py-3.5 flex items-end gap-3"
            style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Technicien assigné
              </label>
              <select value={techInitiales} onChange={e => setTechInitiales(e.target.value)} autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                {techOptions.map(o => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </div>
            <button onClick={handleChangeTech} disabled={saving || !techInitiales.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: 'white', opacity: (saving || !techInitiales.trim()) ? 0.5 : 1 }}>
              {saving ? '…' : 'Confirmer'}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col px-4 py-3 gap-2 overflow-y-auto"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>

          {event.link && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const dest = (event.type === 'prelevement' && event.clientId && event.planId && event.samplingId)
                  ? `/missions/${event.clientId}/plan/${event.planId}/sampling/${event.samplingId}`
                  : event.link
                onClose()
                setTimeout(() => navigate(dest), 50)
              }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
              <ExternalLink size={15} />
              {event.type === 'prelevement' ? 'Voir la mission' :
               event.type === 'maintenance' ? 'Voir la maintenance' :
               'Voir la métrologie'}
            </button>
          )}

          {isPrelev && !event.isDone && (
            <button onClick={() => { setIsMoving(v => !v); setIsChangingTech(false) }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isMoving ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Déplacer à une autre date
            </button>
          )}

          {isPrelev && (
            <button onClick={() => { setIsChangingTech(v => !v); setIsMoving(false) }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }}>
              <ChevronRight size={15} style={{ transform: isChangingTech ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Changer le technicien
            </button>
          )}

          {isPrelev && !event.isDone && !confirmCancel && (
            <button onClick={handleCancel} disabled={saving}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
              ↩ Retirer du calendrier
            </button>
          )}

          {isPrelev && !event.isDone && confirmCancel && (
            <div className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                  Cette intervention appartient à <strong>{event.technicien}</strong>.
                  Es-tu sûr de vouloir la retirer du calendrier ?
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCancel} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--color-danger)', color: 'white' }}>
                  {saving ? 'Retrait…' : 'Oui, retirer'}
                </button>
                <button onClick={() => setConfirmCancel(false)} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {isEvt && (
            <button onClick={() => { onDelete(event); onClose() }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
              <Trash2 size={15} /> Supprimer
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
