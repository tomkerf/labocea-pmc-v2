import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { useVisites } from '@/hooks/useVisites'
import { COLORS } from '@/lib/constants'

export function DemandeVisites({ demandeId, demandeNom, onNavigate }: { demandeId: string; demandeNom: string; onNavigate: () => void }) {
  const navigate = useNavigate()
  const { visites, loading } = useVisites(demandeId)

  function handleNew() {
    onNavigate()
    setTimeout(() => {
      navigate(`/visites/nouveau?type=demande&id=${demandeId}&nom=${encodeURIComponent(demandeNom)}`)
    }, 10)
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.TEXT_SECONDARY, letterSpacing: '0.05em' }}>
          Visites préliminaires
        </span>
        <button type="button" onClick={handleNew} className="text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1"
          style={{ background: COLORS.ACCENT, color: 'white' }}>
          <Plus size={12} />
          Nouvelle
        </button>
      </div>
      {loading ? null : visites.length === 0 ? (
        <p className="text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>Aucune visite enregistrée</p>
      ) : (
        <div className="flex flex-col gap-1">
          {visites.map(v => (
            <button type="button" key={v.id}
              onClick={() => { onNavigate(); setTimeout(() => navigate(`/visites/${v.id}`), 10) }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full"
              style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)' }}>
              <span className="flex-1 text-xs font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
                {new Date(v.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' — '}{v.points.length} pt{v.points.length > 1 ? 's' : ''}
              </span>
              <ChevronRight size={12} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
