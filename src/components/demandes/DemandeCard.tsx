import type { Demande } from '@/types'
import { COLORS } from '@/lib/constants'
import { joursEcoules } from './demandesConfig'

export function DemandeCard({ dem, onClick }: { dem: Demande; onClick: () => void }) {
  const titre = dem.contactSociete || dem.contactNom || 'Sans nom'
  const sous = dem.contactSociete && dem.contactNom ? dem.contactNom : dem.contactEmail
  const j = joursEcoules(dem.dateReception)
  const jColor = j === null ? 'var(--color-text-tertiary)' : j > 30 ? COLORS.DANGER : j > 14 ? COLORS.WARNING : 'var(--color-text-tertiary)'

  return (
    <button type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition-shadow"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
    >
      <p className="text-sm font-semibold truncate" style={{ color: COLORS.TEXT_PRIMARY }}>{titre}</p>
      {sous && <p className="text-xs truncate mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{sous}</p>}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {dem.lieu && <span className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>📍 {dem.lieu}</span>}
        {dem.segment && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
            {dem.segment}
          </span>
        )}
      </div>
      {j !== null && (
        <p className="text-[10px] mt-1.5 font-medium" style={{ color: jColor }}>
          {j > 14 ? '⚠ ' : ''}{j === 0 ? "Reçue aujourd'hui" : `Il y a ${j}j`}
        </p>
      )}
    </button>
  )
}
