import { useNavigate } from 'react-router-dom'
import type { RapportItem } from '@/hooks/useDashboardStats'
import { COLORS } from '@/lib/constants'

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
  const delaiColor = joursAvant === null ? 'var(--color-text-tertiary)'
    : joursAvant < 0 ? COLORS.DANGER
    : joursAvant <= 7 ? COLORS.WARNING
    : COLORS.SUCCESS
  const delaiBg = joursAvant === null ? COLORS.BG_TERTIARY
    : joursAvant < 0 ? 'var(--color-danger-light)'
    : joursAvant <= 7 ? 'var(--color-warning-light)'
    : 'var(--color-success-light)'
  const delaiLabel = joursAvant === null ? '—'
    : joursAvant < 0 ? `${Math.abs(joursAvant)}j de retard`
    : joursAvant === 0 ? "Aujourd'hui"
    : `dans ${joursAvant}j`

  return (
    <div
      key={r.samplingId}
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
          {r.planNom} · <span style={{ color: COLORS.TEXT_SECONDARY }}>{r.siteNom}</span>
        </p>
        <p className="text-xs truncate" style={{ color: COLORS.TEXT_SECONDARY }}>
          intervention le {fmtDone}
          {touteEquipe && <span style={{ color: 'var(--color-text-tertiary)' }}> · {resolveNom(r.doneBy)}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <input
          type="date"
          aria-label="Date prévue du rapport"
          defaultValue={r.rapportDatePrevue}
          onBlur={(e) => { if (e.target.value !== r.rapportDatePrevue) onUpdateDate(r.clientId, r.planId, r.samplingId, e.target.value) }}
          className="rounded-md px-2 py-1 text-xs"
          style={{ border: '1px solid var(--color-border)', background: COLORS.BG_TERTIARY, color: COLORS.TEXT_PRIMARY }}
        />
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: delaiBg, color: delaiColor }}>
          {delaiLabel}
        </span>
        <button type="button"
          onClick={() => navigate(`/missions/${r.clientId}/plan/${r.planId}?sampling=${r.samplingId}`)}
          className="px-2 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY, border: '1px solid var(--color-border)' }}
        >
          Fiche
        </button>
        <button type="button"
          onClick={() => onMark(r.clientId, r.planId, r.samplingId)}
          disabled={sending.has(r.samplingId)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: sending.has(r.samplingId) ? COLORS.BG_TERTIARY : 'var(--color-accent-light)',
            color: sending.has(r.samplingId) ? 'var(--color-text-tertiary)' : COLORS.ACCENT,
            cursor: sending.has(r.samplingId) ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (!sending.has(r.samplingId)) { e.currentTarget.style.background = COLORS.ACCENT; e.currentTarget.style.color = 'white' } }}
          onMouseLeave={e => { if (!sending.has(r.samplingId)) { e.currentTarget.style.background = 'var(--color-accent-light)'; e.currentTarget.style.color = COLORS.ACCENT } }}
        >
          {sending.has(r.samplingId) ? '…' : 'Marquer rédigé'}
        </button>
      </div>
    </div>
  )
}
