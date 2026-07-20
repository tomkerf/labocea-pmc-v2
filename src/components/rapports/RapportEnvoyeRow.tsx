import type { RapportItem } from '@/hooks/useDashboardStats'

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
      className={`flex items-center justify-between gap-3 px-4 py-3.5 ${isLast ? '' : 'border-b border-[var(--color-border-subtle)]'}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 size-2 rounded-full bg-[var(--color-success)]" />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">
            {r.planNom} <span className="text-[var(--color-text-tertiary)] font-normal">·</span> <span className="text-[var(--color-text-secondary)] font-medium">{r.siteNom}</span>
          </p>
          <p className="text-[11px] text-[var(--color-text-secondary)] font-medium mt-0.5">
            Intervention le {fmtDone}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
          Rédigé le {fmtEnvoye}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
          {resolveNom(r.doneBy)}
        </span>
      </div>
    </div>
  )
}
