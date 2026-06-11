import type { RapportItem } from '@/hooks/useDashboardStats'
import { COLORS } from '@/lib/constants'

interface RapportEnvoyeRowProps {
  r: RapportItem
  isLast: boolean
  resolveNom: (uid: string) => string
}

export default function RapportEnvoyeRow({ r, isLast, resolveNom }: RapportEnvoyeRowProps) {
  const fmtDone = r.doneDate
    ? new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'
  const fmtEnvoye = r.rapportDatePrevue
    ? new Date(r.rapportDatePrevue + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}
    >
      <span className="shrink-0 size-2 rounded-full" style={{ background: COLORS.SUCCESS }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
          {r.planNom} · <span style={{ color: COLORS.TEXT_SECONDARY }}>{r.siteNom}</span>
        </p>
        <p className="text-xs truncate" style={{ color: COLORS.TEXT_SECONDARY }}>
          intervention le {fmtDone}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
          Rédigé le {fmtEnvoye}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {resolveNom(r.doneBy)}
        </span>
      </div>
    </div>
  )
}
