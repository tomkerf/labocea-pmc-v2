import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { daysDiff } from '@/lib/dashboardUtils'
import type { Maintenance } from '@/types'

export function MaintenancesWidget({ maintenances }: { maintenances: Maintenance[] }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  if (maintenances.length === 0) return null

  return (
    <div className="mb-6">
      <button type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-3 w-full text-left"
      >
        <span className="text-xs font-semibold uppercase"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          Maintenances
        </span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
          {maintenances.length}
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
            {maintenances.map((m, i) => {
              const enCours  = m.statut === 'en_cours'
              const enRetard = m.statut === 'planifiee' && daysDiff(m.datePrevue) < 0
              const dotColor   = enCours ? 'var(--color-accent)' : enRetard ? 'var(--color-danger)' : 'var(--color-warning)'
              const badgeBg    = enCours ? 'var(--color-accent-light)' : enRetard ? 'var(--color-danger-light)' : 'var(--color-warning-light)'
              const badgeColor = enCours ? 'var(--color-accent)' : enRetard ? 'var(--color-danger)' : 'var(--color-warning)'
              const badgeLabel = enCours ? 'En cours' : enRetard ? 'En retard' : `Dans ${daysDiff(m.datePrevue)}j`
              const typeLabel  = m.type === 'preventive' ? 'Préventive' : m.type === 'corrective' ? 'Corrective' : 'Panne'
              return (
                <div key={m.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  style={{ borderBottom: i < maintenances.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                  onClick={() => navigate(`/maintenances/${m.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: dotColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{m.equipementNom || '—'}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {typeLabel}{m.description ? ` · ${m.description}` : ''}
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
