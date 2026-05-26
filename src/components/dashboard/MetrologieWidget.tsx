import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { daysDiff } from '@/lib/dashboardUtils'
import type { Equipement } from '@/types'

export function MetrologieWidget({ equipements }: { equipements: Equipement[] }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  if (equipements.length === 0) return null

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-3 w-full text-left"
      >
        <span className="text-xs font-semibold uppercase"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          Métrologie à prévoir (J-14)
        </span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
          {equipements.length}
        </span>
        <ChevronDown size={14} strokeWidth={2} style={{
          color: 'var(--color-text-tertiary)', marginLeft: 'auto',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease',
        }} />
      </button>
      {open && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {equipements.map((eq, i) => {
              if (!eq.prochainEtalonnage) return null
              const dateObj = eq.prochainEtalonnage.split('T')[0]
              const diff = daysDiff(dateObj)
              const enRetard = diff < 0
              const dotColor   = enRetard ? 'var(--color-danger)' : 'var(--color-warning)'
              const badgeBg    = enRetard ? 'var(--color-danger-light)' : 'var(--color-warning-light)'
              const badgeColor = enRetard ? 'var(--color-danger)' : 'var(--color-warning)'
              const badgeLabel = enRetard ? 'En retard' : diff === 0 ? "Aujourd'hui" : `Dans ${diff}j`
              
              return (
                <div key={eq.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  style={{ borderBottom: i < equipements.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                  onClick={() => navigate(`/materiel/${eq.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: dotColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{eq.nom}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {eq.marque} {eq.modele} — {eq.numSerie}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: badgeBg, color: badgeColor }}>
                    {badgeLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
