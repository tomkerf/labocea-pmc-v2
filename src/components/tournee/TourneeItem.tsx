import { CheckCircle2, X, MapPin } from 'lucide-react'

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
  status: 'todo' | 'done' | 'non_effectue'
  motif: string
}

interface Props {
  item: TourneeItemData
  onAction: (samplingId: string, action: 'done' | 'non_effectue') => void
}

export function TourneeItem({ item, onAction }: Props) {
  const isDone = item.status === 'done'
  const isNonFait = item.status === 'non_effectue'
  const isTerminal = isDone || isNonFait

  const bg = isDone
    ? 'var(--color-success-light)'
    : isNonFait
    ? 'var(--color-warning-light)'
    : 'var(--color-bg-secondary)'

  const badgeLabel = isDone ? 'Réalisé' : isNonFait ? 'Non effectué' : 'À faire'
  const badgeBg    = isDone ? 'var(--color-success-light)' : isNonFait ? 'var(--color-warning-light)' : 'var(--color-bg-tertiary)'
  const badgeColor = isDone ? 'var(--color-success)' : isNonFait ? 'var(--color-warning)' : 'var(--color-text-secondary)'

  const hasGps = item.lat !== '' && item.lng !== ''
  const mapsUrl = `https://maps.apple.com/?q=${item.lat},${item.lng}`

  return (
    <div className="rounded-xl mb-3 overflow-hidden"
      style={{ background: bg, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {/* En-tête */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        {item.time ? (
          <span className="text-xs font-semibold shrink-0 w-12 text-center px-1.5 py-1 rounded-lg"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            {item.time}
          </span>
        ) : (
          <span className="shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--color-accent)' }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
            {item.clientNom}
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {item.siteNom} · {item.planNom}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.meteo === 'pluie' && (
            <span title="Prélèvement temps de pluie" className="text-base leading-none">🌧</span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: badgeBg, color: badgeColor }}>{badgeLabel}</span>
        </div>
      </div>

      {/* Actions */}
      {!isTerminal && (
        <div className="flex gap-2 px-4 pb-4 pt-1">
          <button
            aria-label="Réalisé"
            onClick={() => onAction(item.samplingId, 'done')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={15} />
            Réalisé
          </button>
          <button
            aria-label="Non effectué"
            onClick={() => onAction(item.samplingId, 'non_effectue')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <X size={15} />
            Non effectué
          </button>
          {hasGps && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GPS"
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              <MapPin size={15} />
              GPS
            </a>
          )}
        </div>
      )}
    </div>
  )
}
