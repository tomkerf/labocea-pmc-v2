import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { useVisites } from '@/hooks/useVisites'
import { COLORS } from '@/lib/constants'


interface Props {
  clientId: string
  clientNom: string
}

const FAISABILITE_COLORS: Record<string, string> = {
  ok: COLORS.SUCCESS,
  difficile: COLORS.WARNING,
  impossible: COLORS.DANGER,
}

export default function ClientVisites({ clientId, clientNom }: Props) {
  const navigate = useNavigate()
  const { visites, loading } = useVisites(clientId)

  function handleNew() {
    navigate(`/visites/nouveau?type=client&id=${clientId}&nom=${encodeURIComponent(clientNom)}`)
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
          Visites préliminaires
        </h2>
        <button type="button"
          onClick={handleNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: COLORS.ACCENT, color: 'white' }}
        >
          <Plus size={14} />
          Nouvelle visite
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="size-5 rounded-full border-2 animate-spin"
            style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
        </div>
      ) : visites.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
          Aucune visite préliminaire enregistrée
        </p>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          {visites.map((v, idx) => (
            <button type="button"
              key={v.id}
              onClick={() => navigate(`/visites/${v.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{ borderBottom: idx < visites.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = COLORS.BG_TERTIARY)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
                  Visite du {new Date(v.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                  {v.points.length} point{v.points.length > 1 ? 's' : ''} · {v.technicienNom}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {v.points.slice(0, 4).map(p => (
                  <span key={p.id} className="size-2 rounded-full"
                    style={{ background: FAISABILITE_COLORS[p.faisabilite] ?? 'var(--color-neutral)' }} />
                ))}
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
