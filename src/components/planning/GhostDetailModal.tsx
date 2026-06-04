import { useNavigate } from 'react-router-dom'
import { X, ExternalLink } from 'lucide-react'
import { useUsersStore } from '@/stores/usersStore'
import type { PlanningEvent } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'


function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso.length > 10 ? iso : iso + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function GhostDetailModal({ event, onClose }: { event: PlanningEvent; onClose: () => void }) {
  const navigate = useNavigate()
  const users    = useUsersStore(s => s.users)

  const resolveUser = (uid?: string) => {
    if (!uid) return null
    const u = users.find(u => u.uid === uid)
    if (!u) return uid
    return `${u.prenom} ${u.nom}`
  }

  const isRetrait = event.ghostAction === 'retiré'

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
          <span className="size-2.5 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--color-neutral)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold leading-snug"
              style={{ color: COLORS.TEXT_PRIMARY, textDecoration: isRetrait ? 'line-through' : 'none' }}>
              {event.title}
            </p>
            {event.subtitle && event.subtitle !== '—' && (
              <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                {event.subtitle}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
                {isRetrait ? '↩ Retiré du calendrier' : '→ Reporté'}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg shrink-0 mt-0.5"
            style={{ color: 'var(--color-text-tertiary)', background: COLORS.BG_TERTIARY }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

        {/* Détails */}
        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>

          {event.ghostNewDate && !isRetrait && (
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>Reporté au</p>
              <p className="text-sm font-medium capitalize" style={{ color: COLORS.TEXT_PRIMARY }}>
                {fmtDate(event.ghostNewDate)}
              </p>
            </div>
          )}

          {event.ghostReason && (
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>Motif</p>
              <p className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>
                {event.ghostReason}
              </p>
            </div>
          )}

          {event.ghostBy && (
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>Par</p>
              <p className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{resolveUser(event.ghostBy)}</p>
            </div>
          )}

          {event.ghostAt && (
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>Le</p>
              <p className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{fmtDateTime(event.ghostAt)}</p>
            </div>
          )}

          {event.clientId && event.planId && event.samplingId && (
            <button type="button"
              onClick={() => {
                onClose()
                setTimeout(() => navigate(event.link), 50)
              }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full mt-1"
              style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
              <ExternalLink size={15} />
              Voir la mission
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
