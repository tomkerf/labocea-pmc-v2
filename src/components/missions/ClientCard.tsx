import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Client } from '@/types'

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function getNextSampling(client: Client): { label: string; overdue: boolean } | null {
  const now = new Date()
  const currentMonth = now.getMonth()

  let next: { month: number; overdue: boolean } | null = null

  for (const plan of client.plans) {
    for (const s of plan.samplings) {
      if (s.status === 'done' || s.status === 'non_effectue') continue
      if (s.status === 'overdue') {
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
      if (s.status === 'overdue') overdue++
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

  return (
    <button
      onClick={() => navigate(`/missions/${client.id}`)}
      className="w-full text-left flex items-center gap-4 px-5 py-4 transition-colors"
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Initiale */}
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
        style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
        {client.nom.charAt(0).toUpperCase()}
      </div>

      {/* Infos principales */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {client.nom}
          </span>
          {counts.overdue > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
              {counts.overdue} en retard
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {client.segment || '—'}
          </span>
          {client.preleveur && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              {client.preleveur}
            </span>
          )}
        </div>
      </div>

      {/* Prochaine intervention */}
      <div className="text-right shrink-0">
        {next ? (
          <>
            <p className="text-xs font-medium"
              style={{ color: next.overdue ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
              {next.overdue ? '⚠ En retard' : 'Prochain'}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {next.label}
            </p>
          </>
        ) : (
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>—</p>
        )}
      </div>

      <ChevronRight size={16} style={{ color: 'var(--color-text-tertiary)' }} className="shrink-0" />
    </button>
  )
}
