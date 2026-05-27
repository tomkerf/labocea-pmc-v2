import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface RapportItem {
  clientId: string; planId: string; samplingId: string
  clientNom: string; siteNom: string
  doneDate: string; joursDepuis: number; enRetard: boolean
  rapportDatePrevue: string
}

interface RapportsWidgetProps {
  rapports: RapportItem[]
  onMarkEnvoye: (clientId: string, planId: string, samplingId: string) => void
}

export function RapportsWidget({ rapports, onMarkEnvoye }: RapportsWidgetProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="mb-6">
      <button type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-3 w-full text-left"
      >
        <span className="text-xs font-semibold uppercase"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          Rapports à rédiger
        </span>
        {rapports.length > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            {rapports.length}
          </span>
        )}
        <ChevronDown size={14} strokeWidth={2} style={{
          color: 'var(--color-text-tertiary)', marginLeft: 'auto',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease',
        }} />
      </button>
      {open && (
        rapports.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-sm"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)', color: 'var(--color-text-secondary)' }}>
            ✓ Tous les rapports ont été envoyés.
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {rapports.map((r, i) => {
                const fmtDone = new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                const fmtPrevue = r.rapportDatePrevue
                  ? new Date(r.rapportDatePrevue + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  : '—'
                const today = new Date(); today.setHours(0,0,0,0)
                const joursAvant = r.rapportDatePrevue
                  ? Math.floor((new Date(r.rapportDatePrevue).getTime() - today.getTime()) / 86400000)
                  : null
                const dotColor = joursAvant === null ? 'var(--color-neutral)' : joursAvant < 0 ? 'var(--color-danger)' : joursAvant <= 7 ? 'var(--color-warning)' : 'var(--color-success)'
                const tagBg    = joursAvant === null ? 'var(--color-bg-tertiary)' : joursAvant < 0 ? 'var(--color-danger-light)' : joursAvant <= 7 ? 'var(--color-warning-light)' : 'var(--color-success-light)'
                const tagColor = joursAvant === null ? 'var(--color-text-secondary)' : joursAvant < 0 ? 'var(--color-danger)' : joursAvant <= 7 ? 'var(--color-warning)' : 'var(--color-success)'
                const tagLabel = joursAvant === null ? '—' : joursAvant < 0 ? `${Math.abs(joursAvant)}j de retard` : joursAvant === 0 ? "aujourd'hui" : `dans ${joursAvant}j`
                return (
                  <div key={r.samplingId}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < rapports.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                    <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: dotColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{r.clientNom}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {r.siteNom} · intervention {fmtDone} · envoi prévu {fmtPrevue}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: tagBg, color: tagColor }}>
                      {tagLabel}
                    </span>
                    <button type="button"
                      onClick={() => onMarkEnvoye(r.clientId, r.planId, r.samplingId)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent)', (e.currentTarget.style.color = 'white'))}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent-light)', (e.currentTarget.style.color = 'var(--color-accent)'))}
                    >
                      Rédigé ✓
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <button type="button"
                onClick={() => navigate('/rapports')}
                className="text-xs font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                Voir tous les rapports →
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
