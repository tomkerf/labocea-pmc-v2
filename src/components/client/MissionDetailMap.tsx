import { MapPin, Navigation } from 'lucide-react'
import { COLORS } from '@/lib/constants'

interface Props {
  hasGps: boolean;
  lat?: string;
  lng?: string;
  siteNom?: string;
  nom?: string;
}

export function MissionDetailMap({ hasGps, lat, lng, siteNom, nom }: Props) {
  const mapsUrl = hasGps
    ? `https://maps.google.com/?q=${lat},${lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(siteNom || nom || '')}`

  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative"
      style={{ height: 160, background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)' }}>
      {hasGps ? (
        <iframe
          title="map"
          src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
          className="size-full border-0"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div className="size-full flex flex-col items-center justify-center gap-2">
          <MapPin size={28} style={{ color: 'var(--color-text-tertiary)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Coordonnées GPS non renseignées
          </p>
        </div>
      )}
      {/* Bouton ouvrir Maps */}
      <a href={mapsUrl} target="_blank" rel="noreferrer"
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold hover:scale-105 transition-transform"
        style={{ background: 'white', color: COLORS.ACCENT, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <Navigation size={12} />
        Ouvrir Maps
      </a>
    </div>
  )
}
