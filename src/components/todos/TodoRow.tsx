import { m } from 'framer-motion'
import { Check, Edit2, Trash2 } from 'lucide-react'
import type { NavigateFunction } from 'react-router-dom'
import type { Todo } from '@/types'
import { COLORS } from '@/lib/constants'
import { getTechColor } from '@/lib/planningUtils'
import UserAvatar from '@/components/ui/UserAvatar'

const prioColors: Record<string, { text: string; bg: string; label: string; icon: string }> = {
  haute:   { text: COLORS.TEXT_PRIMARY,   bg: COLORS.BG_TERTIARY, label: 'Haute',   icon: '!!!' },
  moyenne: { text: COLORS.TEXT_PRIMARY,   bg: COLORS.BG_TERTIARY, label: 'Moyenne', icon: '!!' },
  basse:   { text: COLORS.TEXT_SECONDARY, bg: COLORS.BG_TERTIARY, label: 'Basse',   icon: '!' },
}

interface TodoRowProps {
  todo: Todo
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  deletingId: string | null
  setDeletingId: (id: string | null) => void
  isOverdue: (date?: string) => boolean
  navigate: NavigateFunction
}

export default function TodoRow({
  todo,
  onToggle,
  onEdit,
  onDelete,
  deletingId,
  setDeletingId,
  isOverdue,
  navigate,
}: TodoRowProps) {
  const isCompleted = todo.statut === 'termine'
  const isCnfDelete = deletingId === todo.id
  const colors = prioColors[todo.priorite]

  const assigneeInitiales = todo.assignedToInitiales || (todo.assignedTo === 'equipe' ? 'Éq' : undefined)
  const assigneeColor = assigneeInitiales ? getTechColor(assigneeInitiales).color : undefined

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className={`group flex items-start gap-3 p-4 rounded-xl border transition-all ${
        isCompleted ? 'bg-neutral-50/50 opacity-60 border-neutral-200' : 'bg-white shadow-sm border-neutral-100 hover:shadow-md'
      }`}
    >
      {/* Checkbox ronde Apple-style */}
      <button type="button"
        onClick={onToggle}
        aria-label={isCompleted ? 'Marquer comme non terminé' : 'Marquer comme terminé'}
        className="mt-0.5 shrink-0 flex items-center justify-center size-5.5 rounded-full border transition-all cursor-pointer focus:outline-none"
        style={{
          borderColor: isCompleted ? COLORS.SUCCESS : COLORS.BORDER,
          background: isCompleted ? 'var(--color-success-light)' : 'transparent',
          color: COLORS.SUCCESS,
        }}
      >
        {isCompleted && <Check size={11} strokeWidth={3.5} />}
      </button>

      {/* Détails */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start flex-wrap gap-x-2 gap-y-1">
          <p
            className={`text-[14px] font-medium transition-colors ${
              isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
          >
            {todo.titre}
          </p>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] mt-0.5"
            style={{ color: todo.priorite === 'basse' ? COLORS.TEXT_SECONDARY : COLORS.TEXT_PRIMARY }}
          >
            <span className="size-1.5 rounded-full shrink-0" 
              style={{ 
                backgroundColor: todo.priorite === 'haute' 
                  ? 'var(--color-danger)' 
                  : todo.priorite === 'moyenne' 
                  ? 'var(--color-warning)' 
                  : 'var(--color-neutral)' 
              }} 
            />
            {colors.label.toUpperCase()}
          </span>
          {todo.statut === 'en_cours' && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] mt-0.5"
              style={{ color: COLORS.WARNING }}
            >
              <span className="size-1.5 rounded-full bg-current shrink-0" />
              EN COURS
            </span>
          )}
        </div>

        {todo.description && (
          <p className={`text-xs mt-1 ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>{todo.description}</p>
        )}

        {/* Liaisons & Échéance */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
          {todo.dueDate && (
            <span
              className="font-medium shrink-0"
              style={{
                color: !isCompleted && isOverdue(todo.dueDate) ? COLORS.DANGER : 'inherit',
              }}
            >
              📅 {todo.dueDate.split('-').reverse().join('/')} {!isCompleted && isOverdue(todo.dueDate) && '(en retard)'}
            </span>
          )}

          {todo.clientNom && (
            <>
              {todo.dueDate && <span>•</span>}
              <button type="button"
                className="hover:underline font-semibold shrink-0 text-left"
                style={{ color: COLORS.ACCENT }}
                onClick={() => navigate(`/missions/${todo.clientId}`)}
              >
                💼 {todo.clientNom}
              </button>
            </>
          )}

          {todo.equipementNom && (
            <>
              {(todo.dueDate || todo.clientNom) && <span>•</span>}
              <button type="button"
                className="hover:underline font-semibold shrink-0 text-left"
                style={{ color: COLORS.ACCENT }}
                onClick={() => navigate(`/materiel/${todo.equipementId}`)}
              >
                🔧 {todo.equipementNom}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Actions & Assigné */}
      <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-3 relative pl-2">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button"
            onClick={onEdit}
            aria-label="Modifier la tâche"
            className="p-1.5 rounded-md hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600 focus:outline-none"
          >
            <Edit2 size={13} strokeWidth={2.5} />
          </button>
          
          {isCnfDelete ? (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
              <button type="button"
                onClick={onDelete}
                className="px-2 py-1 text-[10px] font-bold rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Confirmer
              </button>
              <button type="button"
                onClick={() => setDeletingId(null)}
                className="px-2 py-1 text-[10px] font-bold rounded bg-neutral-50 text-neutral-500 hover:bg-neutral-100 transition-colors"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button type="button"
              onClick={() => setDeletingId(todo.id)}
              aria-label="Supprimer la tâche"
              className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-neutral-500 hover:text-red-500 focus:outline-none"
            >
              <Trash2 size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {assigneeInitiales && (
          <div className="mt-auto pl-1 pb-0.5" title={todo.assignedToNom || 'Équipe'}>
            <UserAvatar 
              initiales={assigneeInitiales} 
              color={assigneeColor} 
              size={24} 
            />
          </div>
        )}
      </div>
    </m.div>
  )
}
