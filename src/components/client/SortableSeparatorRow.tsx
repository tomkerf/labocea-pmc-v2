import { Trash2, AlertTriangle, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Plan } from '@/types'
import { COLORS } from '@/lib/constants'

interface SortableSeparatorRowProps {
  plan: Plan
  isLast: boolean
  isConfirmingDelete: boolean
  locked?: boolean
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onLabelChange: (label: string) => void
}

export default function SortableSeparatorRow({
  plan, isLast, isConfirmingDelete, locked,
  onDelete, onConfirmDelete, onCancelDelete, onLabelChange,
}: SortableSeparatorRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: plan.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button"
          {...(!locked ? { ...attributes, ...listeners } : {})}
          className="shrink-0 p-1 rounded touch-none"
          style={{ color: 'var(--color-text-tertiary)', cursor: locked ? 'default' : isDragging ? 'grabbing' : 'grab', opacity: locked ? 0.3 : 1 }}
          tabIndex={-1}
        >
          <GripVertical size={15} strokeWidth={1.8} />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: COLORS.BORDER }} />
          <input
            value={plan.nom}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Section…"
            aria-label="Nom du séparateur"
            className="bg-transparent border-none outline-none text-center"
            style={{
              color: 'var(--color-text-tertiary)',
              fontSize: '12px',
              fontWeight: 500,
              minWidth: '40px',
              width: `${Math.max(60, (plan.nom.length || 4) * 7 + 24)}px`,
              letterSpacing: '0.03em',
            }}
          />
          <div className="flex-1 h-px" style={{ background: COLORS.BORDER }} />
        </div>

        <button type="button" onClick={onDelete} aria-label="Supprimer le séparateur" className="shrink-0 p-1 rounded"
          style={{ color: isConfirmingDelete ? COLORS.DANGER : 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.DANGER)}
          onMouseLeave={(e) => { if (!isConfirmingDelete) e.currentTarget.style.color = 'var(--color-text-tertiary)' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {isConfirmingDelete && (
        <div className="flex items-center gap-2 mx-3 mb-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
          <AlertTriangle size={13} style={{ color: COLORS.DANGER, flexShrink: 0 }} />
          <span className="text-xs font-medium flex-1" style={{ color: COLORS.DANGER }}>
            Supprimer ce séparateur ?
          </span>
          <button type="button" onClick={onConfirmDelete}
            className="text-xs font-semibold px-2.5 py-1 rounded"
            style={{ background: COLORS.DANGER, color: 'white' }}>
            Supprimer
          </button>
          <button type="button" onClick={onCancelDelete}
            className="text-xs font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}
