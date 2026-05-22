import { X, Trash2 } from 'lucide-react'
import { SamplingForm } from './SamplingForm'
import type { Sampling, SamplingStatus, AppUser } from '@/types'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const STATUS_CONFIG: Record<SamplingStatus, { label: string; bg: string; color: string }> = {
  planned:       { label: 'Planifié',     bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
  done:          { label: 'Réalisé',      bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  overdue:       { label: 'En retard',    bg: 'var(--color-danger-light)',  color: 'var(--color-danger)' },
  non_effectue:  { label: 'Non effectué', bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
}

interface SamplingRowProps {
  sampling: Sampling
  index: number
  total: number
  isCustom: boolean
  isSelected: boolean
  confirmDel: boolean
  clientId: string
  planId: string
  users: AppUser[]
  onSelect: () => void
  onUpdate: (field: keyof Sampling, val: unknown) => void
  onDeleteRequest: () => void
  onDeleteCancel: () => void
  onDeleteConfirm: () => void
}

export function SamplingRow({
  sampling: s,
  index: i,
  total,
  isCustom,
  isSelected,
  confirmDel,
  clientId,
  planId,
  users,
  onSelect,
  onUpdate,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: SamplingRowProps) {
  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG['planned']
  const dateLabel = s.dateUndefined
    ? 'Date à définir'
    : isCustom
      ? `${s.plannedDay} ${MOIS[s.plannedMonth]}`
      : `${MOIS[s.plannedMonth]}${s.plannedDay ? ` — j${s.plannedDay}` : ''}`

  return (
    <div>
      <div className="flex items-center" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <button
          onClick={onSelect}
          className="flex-1 flex items-center gap-4 px-5 py-3 text-left transition-colors"
          style={{ background: isSelected ? 'var(--color-accent-light)' : 'transparent' }}
        >
          <span className="text-sm font-medium w-6 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
            {s.num}
          </span>
          <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>
            {dateLabel}
          </span>
          {s.doneDate && (
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {new Date(s.doneDate).toLocaleDateString('fr-FR')}
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
        </button>

        {isCustom && (
          confirmDel ? (
            <div className="flex items-center gap-1 px-2">
              <button
                onClick={onDeleteConfirm}
                className="text-xs px-2 py-1 rounded-md font-medium"
                style={{ background: 'var(--color-danger)', color: 'white' }}
              >
                Supprimer
              </button>
              <button
                onClick={onDeleteCancel}
                className="text-xs px-1.5 py-1 rounded-md"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={onDeleteRequest}
              className="px-3 py-3 shrink-0"
              style={{ color: 'var(--color-text-tertiary)' }}
              title="Supprimer ce prélèvement"
            >
              <Trash2 size={14} />
            </button>
          )
        )}
      </div>

      {isSelected && (
        <div
          className="px-5 py-4"
          style={{
            background: 'var(--color-bg-tertiary)',
            borderBottom: i < total - 1 ? '1px solid var(--color-border-subtle)' : 'none',
          }}
        >
          <SamplingForm
            sampling={s}
            onUpdate={onUpdate}
            users={users}
            clientId={clientId}
            planId={planId}
          />
        </div>
      )}
    </div>
  )
}
