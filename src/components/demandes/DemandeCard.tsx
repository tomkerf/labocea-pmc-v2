import { MapPin, Clock } from 'lucide-react'
import type { Demande } from '@/types'
import { joursEcoules } from './demandesConfig'

export function DemandeCard({ dem, onClick }: { dem: Demande; onClick: () => void }) {
  const titre = dem.contactSociete || dem.contactNom || 'Sans nom'
  const sous = dem.contactSociete && dem.contactNom ? dem.contactNom : dem.contactEmail
  const j = joursEcoules(dem.dateReception)

  // Calcule le badge de retard en style pastel Apple-style
  const renderTimeBadge = () => {
    if (j === null) return null

    if (j > 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[rgba(255,59,48,0.15)]">
          <Clock size={10} className="shrink-0" />
          Il y a {j}j (critique)
        </span>
      )
    }
    if (j > 14) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[rgba(255,159,10,0.15)]">
          <Clock size={10} className="shrink-0" />
          Il y a {j}j
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
        <Clock size={10} className="shrink-0" />
        {j === 0 ? "Aujourd'hui" : `Il y a ${j}j`}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-3.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] hover:shadow-md hover:-translate-y-[0.5px] transition-all duration-200 cursor-pointer flex flex-col gap-2.5 active:scale-[0.99] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
    >
      <div>
        <p className="text-[13px] font-bold text-[var(--color-text-primary)] truncate leading-snug">
          {titre}
        </p>
        {sous && (
          <p className="text-[11px] text-[var(--color-text-secondary)] truncate font-medium mt-0.5 leading-normal">
            {sous}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
        {dem.lieu && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)] font-medium">
            <MapPin size={11} className="text-[var(--color-text-tertiary)] shrink-0" />
            <span className="truncate max-w-[130px]">{dem.lieu}</span>
          </span>
        )}
        {dem.segment && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[rgba(0,113,227,0.12)]">
            {dem.segment}
          </span>
        )}
      </div>

      {j !== null && (
        <div className="mt-1 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-2.5">
          {renderTimeBadge()}
        </div>
      )}
    </button>
  )
}
