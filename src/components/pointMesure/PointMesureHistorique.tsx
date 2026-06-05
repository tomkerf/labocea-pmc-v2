import { COLORS } from '@/lib/constants'
import type { Sampling, Client } from '@/types'

interface PointMesureHistoriqueProps {
  samplingHistory: Sampling[];
  client: Client;
}

export function PointMesureHistorique({ samplingHistory, client }: PointMesureHistoriqueProps) {
  return (
    <div className="mx-4">
      <h2 className="text-xs font-semibold uppercase mb-2 px-1"
        style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
        Historique des Prélèvements
      </h2>
      {samplingHistory.length === 0 ? (
        <div className="rounded-2xl px-5 py-4 text-xs text-center"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', color: COLORS.TEXT_SECONDARY }}>
          Aucun prélèvement encore réalisé sur ce point.
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          {samplingHistory.map((s, idx) => {
            const fmtDate = new Date(s.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <div key={s.id} className="px-5 py-3 text-left"
                style={{ borderBottom: idx < samplingHistory.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                    Prélèvement le {fmtDate}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                    tech: {s.assignedTo || client.preleveur || '—'}
                  </span>
                </div>
                {s.comment ? (
                  <p className="text-xs whitespace-pre-wrap" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {s.comment}
                  </p>
                ) : (
                  <p className="text-xs italic" style={{ color: 'var(--color-text-tertiary)' }}>
                    Aucun commentaire.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
