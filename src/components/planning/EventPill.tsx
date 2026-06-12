/**
 * EventPill
 * ─────────────────────────────────────────────────────────────────
 * Pill d'événement dans le calendrier desktop (vue semaine & mois).
 * Extrait de PlanningPage — aucun état externe, 100 % props.
 */

import { useNavigate } from 'react-router-dom'
import { CheckCircle2, FileText, Bell, Wrench, CheckSquare, CalendarDays, Droplet, Backpack } from 'lucide-react'
import { getTechColor, isVeilleJourFerie, type PlanningEvent } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'


interface EventPillProps {
  event:     PlanningEvent
  compact?:  boolean
  dateStr?:  string
  expanded?: boolean
  onExpand?: () => void
  onSelect?: (event: PlanningEvent) => void
}

export default function EventPill({ event, compact, dateStr, expanded, onExpand, onSelect }: EventPillProps) {
  const navigate = useNavigate()

  // compact = true en vue mois : une seule ligne, pas de sous-titre
  const isGrouped   = (event.count ?? 0) > 1
  const hasSubtitle = !compact && event.subtitle && event.subtitle !== '—'
  const hasTech     = event.technicien && event.technicien !== '—'

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (isGrouped && onExpand)  { onExpand();        return }
    if (onSelect)               { onSelect(event);   return }
    if (event.type !== 'evenement') navigate(event.link)
  }

  // ── Rendu fantôme ──────────────────────────────────────────────
  if (event.isGhost) {
    const isRetrait  = event.ghostAction === 'retiré'
    const ghostLabel = isRetrait
      ? '↩ retiré'
      : (() => {
          if (!event.ghostNewDate) return '→ reporté'
          const d = new Date(event.ghostNewDate + 'T12:00:00')
          return `→ ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`
        })()
    return (
      <button type="button"
        onClick={handleClick}
        onMouseDown={e => e.stopPropagation()}
        className="w-full text-left px-1.5 py-[3px] rounded-[3px] leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 hover:opacity-80 transition-opacity"
        style={{ cursor: 'pointer', border: '1px dashed var(--color-border)', background: COLORS.BG_TERTIARY }}
        title={`${event.title} — ${event.ghostAction}${event.ghostReason ? ' · ' + event.ghostReason : ''}`}
      >
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[9px]">{isRetrait ? '↩' : '→'}</span>
          <span className="flex-1 truncate text-[10px]"
            style={{ color: COLORS.TEXT_SECONDARY, textDecoration: isRetrait ? 'line-through' : 'none', fontStyle: 'italic' }}>
            {event.title}
          </span>
          <span className="shrink-0 text-[9px] font-medium px-1 rounded"
            style={{ background: COLORS.BORDER, color: COLORS.TEXT_SECONDARY }}>
            {ghostLabel}
          </span>
        </div>
      </button>
    )
  }

  // ── Congé/RTT ─────────────────────────────────────────────────
  const isConge   = event.type === 'evenement' && event.evenementData?.type === 'conge'
  const techColor = getTechColor(event.technicien).color
  const dotColor  = event.type === 'prelevement'
    ? event.priority === 0 ? COLORS.DANGER   // overdue → rouge
    : event.priority === 1 ? 'var(--color-neutral)'  // non_effectué → gris
    : techColor                                        // planifié → couleur tech
    : event.type === 'evenement' || event.type === 'rapport' ? techColor
    : event.statusColor  // maintenance / vérification

  const isJ1 = event.type === 'prelevement' && !!event.dateFin
  const isJ2 = event.isJ2Continuation === true

  const veilleFerrieNom = event.analysesSousTraitees && dateStr && !event.isDone
    ? isVeilleJourFerie(dateStr)
    : null

  if (isConge) {
    return (
      <div
        className="w-full text-left px-1.5 py-[3px] rounded-[3px] leading-snug"
        style={{ background: COLORS.BG_TERTIARY, cursor: 'default', opacity: 0.85 }}
        title={event.title}
      >
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[10px]">🏖️</span>
          <span className="flex-1 truncate text-[11px] font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>
            {event.title || 'Congé/RTT'}
          </span>
          {hasTech && (
            <span className="shrink-0 text-[9px] font-semibold px-1 rounded"
              style={{ background: techColor + '18', color: techColor }}>
              {event.technicien}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── Pill standard ──────────────────────────────────────────────
  return (
    <button type="button"
      onClick={handleClick}
      onMouseDown={e => e.stopPropagation()}
      className="w-full text-left px-1.5 py-[3px] rounded-[3px] leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 transition-opacity hover:opacity-90"
      style={{
        background: `${dotColor}1A`,
        borderLeft: `3px solid ${dotColor}`,
        cursor: isGrouped ? 'zoom-in' : event.type === 'evenement' ? 'default' : 'pointer',
      }}
      title={
        isGrouped
          ? `${event.title} — ${event.count} prélèvements (cliquer pour détails)`
          : `${event.title} — ${event.subtitle} (${event.technicien})`
      }
    >
      {/* Ligne 1 : dot (ou ✓) + titre + badges */}
      <div className="flex items-center gap-1">
        {event.isDone
          ? <CheckCircle2 size={11} className="shrink-0" style={{ color: dotColor }} />
          : event.type === 'rapport' ? <FileText size={11} className="shrink-0" style={{ color: dotColor }} />
          : event.type === 'verification' ? <Bell size={11} className="shrink-0" style={{ color: dotColor }} />
          : event.type === 'maintenance' ? <Wrench size={11} className="shrink-0" style={{ color: dotColor }} />
          : event.type === 'todo' ? <CheckSquare size={11} className="shrink-0" style={{ color: dotColor }} />
          : event.type === 'evenement' ? <CalendarDays size={11} className="shrink-0" style={{ color: dotColor }} />
          : <Droplet size={11} className="shrink-0" style={{ color: dotColor }} />
        }
        {event.meteo === 'pluie' && (
          <span className="shrink-0 text-[10px]" title="Prélèvement par temps de pluie">🌧</span>
        )}
        {(event.equipementsAssignes?.length ?? 0) > 0 && (
          <span className="shrink-0 flex items-center" title={`${event.equipementsAssignes?.length} équipement(s) assigné(s)`}>
            <Backpack size={10} style={{ color: dotColor }} />
          </span>
        )}
        {veilleFerrieNom && (
          <span className="shrink-0 text-[10px]" title={`Analyses sous-traitées — veille de ${veilleFerrieNom}`}>⚠️</span>
        )}
        <span className="flex-1 truncate text-[11px] font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
          {event.title}
        </span>
        {(isJ1 || isJ2) && (
          <span className="shrink-0 text-[8px] font-bold px-1 rounded"
            style={{ background: dotColor + '22', color: dotColor }}>
            {isJ2 ? 'J2' : 'J1'}
          </span>
        )}
        {hasTech && (
          <span className="shrink-0 text-[9px] font-semibold px-1 rounded"
            style={{ background: dotColor + '18', color: dotColor }}>
            {event.technicien}
          </span>
        )}
        {isGrouped && (
          <span className="shrink-0 text-[9px] font-bold px-1 rounded"
            style={{ background: expanded ? dotColor + '22' : COLORS.BG_TERTIARY, color: expanded ? dotColor : COLORS.TEXT_SECONDARY }}>
            {expanded ? '▲' : `×${event.count}`}
          </span>
        )}
        {event.plannedTime && (
          <span className="shrink-0 text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {event.plannedTime}
          </span>
        )}
      </div>
      {/* Ligne 2 : sous-titre (masqué en vue mois compact) */}
      {hasSubtitle && (
        <div className="text-[10px] truncate pl-[14px]" style={{ color: COLORS.TEXT_SECONDARY }}>
          {event.subtitle}
        </div>
      )}
    </button>
  )
}
