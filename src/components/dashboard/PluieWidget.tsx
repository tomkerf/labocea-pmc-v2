import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

const MOIS_COURT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

interface PluieItem {
  clientNom: string; siteNom: string; planNom: string
  clientId: string; planId: string; samplingId: string
  plannedMonth: number; plannedDay: number; overdue: boolean
}

export function PluieWidget({ items }: { items: PluieItem[] }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  if (items.length === 0) return null

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-3 w-full text-left"
      >
        <span className="text-xs font-semibold uppercase"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          🌧 Temps de pluie
        </span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: '#EFF6FF', color: '#3B82F6' }}>
          {items.length}
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
            {items.map((r, i) => (
              <div key={r.samplingId}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                style={{ borderBottom: i < items.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                onClick={() => navigate(`/missions/${r.clientId}/plan/${r.planId}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="shrink-0 text-base leading-none">🌧</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{r.clientNom}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {[r.siteNom, r.planNom].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: r.overdue ? 'var(--color-danger-light)' : 'var(--color-bg-tertiary)',
                    color:      r.overdue ? 'var(--color-danger)'       : 'var(--color-text-secondary)',
                  }}>
                  {r.plannedDay > 0
                    ? `${r.overdue ? '⚠ ' : ''}${MOIS_COURT[r.plannedMonth]} j${r.plannedDay}`
                    : MOIS_COURT[r.plannedMonth]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
