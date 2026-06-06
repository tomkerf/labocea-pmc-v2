import { ChevronRight, Trash2, AlertTriangle, GripVertical, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { isSamplingOverdue } from '@/lib/overdue'
import type { Plan } from '@/types'
import { COLORS } from '@/lib/constants'

interface SortablePlanRowProps {
  plan: Plan
  clientYear: number | undefined
  clientId: string
  isLast: boolean
  isConfirmingDelete: boolean
  locked?: boolean
  onOpen: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

export default function SortablePlanRow({
  plan, clientYear, clientId, isLast, isConfirmingDelete, locked,
  onOpen, onDelete, onConfirmDelete, onCancelDelete,
}: SortablePlanRowProps) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: plan.id })

  const overdueCount = (plan.samplings ?? []).filter((s) => isSamplingOverdue(s, clientYear)).length

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
        background: isDragging ? 'var(--color-accent-light)' : 'transparent',
      }}
      className="flex flex-col px-3 py-3 gap-2"
    >
      <div className="flex items-center gap-2">
        <button type="button"
          {...(!locked ? { ...attributes, ...listeners } : {})}
          className="shrink-0 p-1 rounded touch-none"
          style={{ color: 'var(--color-text-tertiary)', cursor: locked ? 'default' : isDragging ? 'grabbing' : 'grab', opacity: locked ? 0.3 : 1 }}
          title={locked ? 'Réorganisation verrouillée' : 'Glisser pour réorganiser'}
          tabIndex={-1}
        >
          <GripVertical size={15} strokeWidth={1.8} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
              {plan.nom || 'Point sans nom'}
            </p>
            {overdueCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 flex items-center gap-1"
                style={{ background: 'var(--color-danger-light)', color: COLORS.DANGER }}>
                <AlertTriangle size={10} />
                {overdueCount} en retard
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
            {[plan.siteNom, plan.frequence, plan.nature].filter(Boolean).join(' · ')}
          </p>
        </div>

        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
          {(plan.samplings ?? []).length} prélèv.
        </span>
        <button type="button"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/missions/${clientId}/plan/${plan.id}/fiche`)
          }}
          aria-label="Consulter la fiche du point"
          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Consulter la fiche du point"
        >
          <BookOpen size={14} />
        </button>
        <button type="button" onClick={onOpen}
          className="shrink-0 flex items-center gap-1 text-sm font-medium"
          style={{ color: COLORS.ACCENT }}>
          Ouvrir <ChevronRight size={14} />
        </button>
        <button type="button" onClick={onDelete} aria-label="Supprimer ce point" className="shrink-0 p-1 rounded"
          style={{ color: isConfirmingDelete ? COLORS.DANGER : 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.DANGER)}
          onMouseLeave={(e) => { if (!isConfirmingDelete) e.currentTarget.style.color = 'var(--color-text-tertiary)' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {isConfirmingDelete && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
          <AlertTriangle size={13} style={{ color: COLORS.DANGER, flexShrink: 0 }} />
          <span className="text-xs font-medium flex-1" style={{ color: COLORS.DANGER }}>
            Supprimer ce point et tous ses prélèvements ?
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
