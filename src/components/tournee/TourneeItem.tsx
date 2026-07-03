import { Link } from 'react-router-dom'
import { X, MapPin, CalendarClock, AlertTriangle, Eye } from 'lucide-react'
import { COLORS } from '@/lib/constants'


export interface TourneeItemData {
  samplingId: string
  clientId: string
  planId: string
  clientNom: string
  siteNom: string
  planNom: string
  time: string
  meteo: string
  nature: string
  lat: string
  lng: string
  status: 'todo' | 'done' | 'non_effectue' | 'reporte'
  motif: string
  isJ1Bilan24?: boolean
  rapportPrevu: boolean
}

interface Props {
  item: TourneeItemData
  onAction: (samplingId: string, action: 'done' | 'non_effectue' | 'reporter') => void
}

export function TourneeItem({ item, onAction }: Props) {
  const isDone     = item.status === 'done'
  const isNonFait  = item.status === 'non_effectue'
  const isReporte  = item.status === 'reporte'
  const isTerminal = isDone || isNonFait || isReporte

  const bg = isDone
    ? 'var(--color-success-light)'
    : isNonFait
    ? 'var(--color-warning-light)'
    : isReporte
    ? 'var(--color-accent-light)'
    : COLORS.BG_SECONDARY

  const badgeLabel = isDone ? 'Réalisé' : isNonFait ? 'Non effectué' : isReporte ? 'Reporté' : 'À faire'
  const badgeBg    = isDone ? 'var(--color-success-light)' : isNonFait ? 'var(--color-warning-light)' : isReporte ? 'var(--color-accent-light)' : COLORS.BG_TERTIARY
  const badgeColor = isDone ? 'var(--color-success-text)' : isNonFait ? 'var(--color-warning-text)' : isReporte ? COLORS.ACCENT : COLORS.TEXT_SECONDARY

  const hasGps = item.lat !== '' && item.lng !== ''
  const mapsUrl = `https://maps.apple.com/?q=${item.lat},${item.lng}`

  return (
    <div className="rounded-xl mb-3 overflow-hidden"
      style={{ background: bg, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {/* En-tête */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        {item.time ? (
          <span className="text-xs font-semibold shrink-0 w-12 text-center px-1.5 py-1 rounded-lg animate-pulse"
            style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
            {item.time}
          </span>
        ) : (
          <span className="shrink-0 size-2 rounded-full mt-1.5" style={{ background: COLORS.ACCENT }} />
        )}
        <div className="flex-1 min-w-0">
          <Link
            to={`/missions/${item.clientId}/plan/${item.planId}/fiche`}
            title="Ouvrir la fiche du point"
            className="hover:underline block group"
          >
            <p className="text-base font-semibold leading-snug group-hover:text-accent transition-colors" style={{ color: COLORS.TEXT_PRIMARY }}>
              {item.clientNom}
            </p>
            <p className="text-sm mt-0.5 group-hover:text-accent transition-colors" style={{ color: COLORS.TEXT_SECONDARY }}>
              {item.siteNom} · {item.planNom}
            </p>
          </Link>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!hasGps && (
            <span title="Coordonnées GPS manquantes" className="text-warning flex items-center">
              <AlertTriangle size={18} style={{ color: COLORS.WARNING }} />
            </span>
          )}
          {item.meteo === 'pluie' && (
            <span title="Prélèvement temps de pluie" className="text-base leading-none">🌧</span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: badgeBg, color: badgeColor }}>{badgeLabel}</span>
        </div>
      </div>

      {/* Actions */}
      {!isTerminal && !item.isJ1Bilan24 && (
        <div className="flex flex-col gap-1.5 px-4 pb-4 pt-1">
          <div className="flex gap-2">
            <button type="button"
              aria-label="Réalisé"
              onClick={() => onAction(item.samplingId, 'done')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'var(--color-success-light)', color: 'var(--color-success-text)' }}>
              Réalisé
            </button>
            <button type="button"
              aria-label="Non effectué"
              onClick={() => onAction(item.samplingId, 'non_effectue')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }}>
              <X size={15} />
              Non effectué
            </button>
            <button type="button"
              aria-label="Décaler"
              onClick={() => onAction(item.samplingId, 'reporter')}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}>
              <CalendarClock size={15} />
            </button>
            <Link
              to={`/missions/${item.clientId}/plan/${item.planId}/fiche`}
              aria-label="Mémoire du point"
              title="Consulter la fiche du point (consignes, historique, photos)"
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT, border: '1px solid var(--color-border-subtle)' }}
            >
              <Eye size={15} />
            </Link>
            {hasGps && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GPS"
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
                <MapPin size={15} />
              </a>
            )}
          </div>
        </div>
      )}
      {!isTerminal && item.isJ1Bilan24 && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-1.5">
          <div className="flex gap-2">
            <button type="button"
              aria-label="Décaler"
              onClick={() => onAction(item.samplingId, 'reporter')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: COLORS.ACCENT, color: 'white' }}>
              <CalendarClock size={15} />
              Décaler la mission
            </button>
            <Link
              to={`/missions/${item.clientId}/plan/${item.planId}/fiche`}
              aria-label="Mémoire du point"
              title="Consulter la fiche du point (consignes, historique, photos)"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT, border: '1px solid var(--color-border-subtle)' }}
            >
              <Eye size={15} />
            </Link>
          </div>
          <button type="button"
            aria-label="Non effectué"
            onClick={() => onAction(item.samplingId, 'non_effectue')}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }}>
            <X size={14} />
            Non effectué
          </button>
        </div>
      )}
    </div>
  )
}
