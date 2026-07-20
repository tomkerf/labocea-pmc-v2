import { useNavigate } from 'react-router-dom'
import type { RapportItem } from '@/hooks/useDashboardStats'

interface RapportRowProps {
  r: RapportItem
  isLast: boolean
  todayStr: string
  touteEquipe: boolean
  resolveNom: (uid: string) => string
  sending: Set<string>
  onMark: (clientId: string, planId: string, samplingId: string) => void
  onUpdateDate: (clientId: string, planId: string, samplingId: string, date: string) => void
}

export default function RapportRow({ r, isLast, todayStr, touteEquipe, resolveNom, sending, onMark, onUpdateDate }: RapportRowProps) {
  const navigate = useNavigate()

  const fmtDone = r.doneDate
    ? new Date(r.doneDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'
  const joursAvant = r.rapportDatePrevue
    ? Math.floor((new Date(r.rapportDatePrevue).getTime() - new Date(todayStr).getTime()) / 86400000)
    : null

  // Calcule le badge de retard/délai en pastel premium
  const renderDelaiBadge = () => {
    if (joursAvant === null) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
          —
        </span>
      )
    }

    if (joursAvant < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[rgba(255,59,48,0.15)]">
          <span className="size-1 rounded-full bg-[var(--color-danger)] animate-pulse" />
          {Math.abs(joursAvant)}j de retard
        </span>
      )
    }
    if (joursAvant <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[rgba(255,159,10,0.15)]">
          <span className="size-1 rounded-full bg-[var(--color-warning)]" />
          {joursAvant === 0 ? "Aujourd'hui" : `dans ${joursAvant}j`}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-success-light)] text-[var(--color-success)] border border-[rgba(52,199,89,0.15)]">
        <span className="size-1 rounded-full bg-[var(--color-success)]" />
        dans {joursAvant}j
      </span>
    )
  }

  return (
    <div
      key={r.samplingId}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 ${isLast ? '' : 'border-b border-[var(--color-border-subtle)]'}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">
          {r.planNom} <span className="text-[var(--color-text-tertiary)] font-normal">·</span> <span className="text-[var(--color-text-secondary)] font-medium">{r.siteNom}</span>
        </p>
        <p className="text-[11px] text-[var(--color-text-secondary)] font-medium mt-0.5 truncate">
          Intervention le {fmtDone}
          {touteEquipe && <span className="text-[var(--color-text-tertiary)] font-normal"> · {resolveNom(r.doneBy)}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <input
          type="date"
          aria-label="Date prévue du rapport"
          defaultValue={r.rapportDatePrevue}
          onBlur={(e) => { if (e.target.value !== r.rapportDatePrevue) onUpdateDate(r.clientId, r.planId, r.samplingId, e.target.value) }}
          className="rounded-lg px-2.5 py-1 text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] shadow-sm"
        />
        {renderDelaiBadge()}
        
        <button type="button"
          onClick={() => navigate(`/missions/${r.clientId}/plan/${r.planId}?sampling=${r.samplingId}`)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          Fiche
        </button>
        <button type="button"
          onClick={() => onMark(r.clientId, r.planId, r.samplingId)}
          disabled={sending.has(r.samplingId)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98] border shadow-sm ${
            sending.has(r.samplingId)
              ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] border-[var(--color-border-subtle)] cursor-not-allowed'
              : 'bg-[var(--color-accent-light)] hover:bg-[var(--color-accent)] text-[var(--color-accent)] hover:text-white border-[rgba(0,113,227,0.15)] hover:border-transparent cursor-pointer'
          }`}
        >
          {sending.has(r.samplingId) ? '…' : 'Marquer rédigé'}
        </button>
      </div>
    </div>
  )
}
