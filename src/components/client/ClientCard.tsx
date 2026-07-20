import { useNavigate } from 'react-router-dom'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import type { Client } from '@/types'
import { isSamplingOverdue } from '@/lib/overdue'
import { getTechColor } from '@/lib/planningUtils'


const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function getNextSampling(client: Client): { label: string; overdue: boolean } | null {
  const now = new Date()
  const currentMonth = now.getMonth()
  let next: { month: number; overdue: boolean } | null = null

  for (const plan of client.plans) {
    for (const s of plan.samplings) {
      if (s.status === 'done' || s.status === 'non_effectue') continue
      const overdue = isSamplingOverdue(s, Number(client.annee) || undefined, plan.methode === 'Automatique')
      if (overdue) {
        if (!next || next.month > s.plannedMonth) next = { month: s.plannedMonth, overdue: true }
      } else if (s.plannedMonth >= currentMonth) {
        if (!next || s.plannedMonth < next.month) next = { month: s.plannedMonth, overdue: false }
      }
    }
  }

  if (!next) return null
  return { label: MOIS[next.month], overdue: next.overdue }
}

function countByStatus(client: Client) {
  let overdue = 0, planned = 0, done = 0
  for (const plan of client.plans) {
    for (const s of plan.samplings) {
      if (isSamplingOverdue(s, Number(client.annee) || undefined, plan.methode === 'Automatique')) overdue++
      else if (s.status === 'planned') planned++
      else if (s.status === 'done') done++
    }
  }
  return { overdue, planned, done }
}

interface Props { client: Client }

export default function ClientCard({ client }: Props) {
  const navigate = useNavigate()
  const next = getNextSampling(client)
  const counts = countByStatus(client)
  const techColor = client.preleveur ? getTechColor(client.preleveur).color : undefined

  return (
    <button
      type="button"
      onClick={() => navigate(`/missions/${client.id}`)}
      className="w-full text-left flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] hover:bg-[var(--color-bg-tertiary)] active:scale-[0.99] transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Initiale */}
        <div className="size-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[rgba(0,113,227,0.08)]">
          {client.nom.charAt(0).toUpperCase()}
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {client.nom}
            </span>
            {counts.overdue > 0 && (
              <AlertTriangle size={13} strokeWidth={2.5} className="shrink-0 text-[var(--color-danger)]" />
            )}
            {client.pause && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
                En pause
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-[var(--color-text-secondary)] truncate">
              {client.segment || '—'}
            </span>
            {client.preleveur && techColor && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: techColor + '15', color: techColor }}>
                {client.preleveur}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Prochaine intervention */}
        <div className="text-right">
          {next ? (
            <>
              <p className={`text-xs font-medium flex items-center justify-end gap-1 ${next.overdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`}>
                {next.overdue
                  ? <AlertTriangle size={12} strokeWidth={2} />
                  : 'Prochain'}
              </p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {next.label}
              </p>
            </>
          ) : (
            <p className="text-xs flex items-center justify-end gap-1.5 text-[var(--color-text-tertiary)]">
              <span className="size-[5px] rounded-full shrink-0 bg-[var(--color-text-tertiary)]" />
              Aucune
            </p>
          )}
        </div>

        <ChevronRight size={14} className="text-[var(--color-text-tertiary)] shrink-0" />
      </div>
    </button>
  )
}
