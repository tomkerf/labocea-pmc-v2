import { MapPin, Navigation } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import type { Plan } from '@/types'

export function PointMesureMap({ plan }: { plan: Plan }) {
  const hasGps = plan.lat && plan.lng && plan.lat !== '' && plan.lng !== ''
  const mapsUrl = hasGps
    ? `https://maps.google.com/?q=${plan.lat},${plan.lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(plan.siteNom || plan.nom || '')}`

  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative"
      style={{ height: 160, background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)' }}>
      {hasGps ? (
        <iframe
          title="map"
          src={`https://maps.google.com/maps?q=${plan.lat},${plan.lng}&z=15&output=embed`}
          className="size-full border-0"
          loading="lazy"
          sandbox="allow-scripts allow-popups"
        />
      ) : (
        <div className="size-full flex flex-col items-center justify-center gap-2">
          <MapPin size={28} style={{ color: 'var(--color-text-tertiary)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Coordonnées GPS non renseignées
          </p>
        </div>
      )}
      <a href={mapsUrl} target="_blank" rel="noreferrer"
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold focus:outline-none focus-visible:ring-2"
        style={{ background: 'white', color: COLORS.ACCENT, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <Navigation size={12} />
        Ouvrir Maps
      </a>
    </div>
  )
}
