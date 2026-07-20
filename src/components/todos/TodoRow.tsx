import { m } from 'framer-motion'
import { Check, Edit2, Trash2, Calendar, Briefcase, Wrench } from 'lucide-react'
import type { NavigateFunction } from 'react-router-dom'
import type { Todo } from '@/types'
import { getTechColor } from '@/lib/planningUtils'
import UserAvatar from '@/components/ui/UserAvatar'

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

  const assigneeInitiales = todo.assignedToInitiales || (todo.assignedTo === 'equipe' ? 'Éq' : undefined)
  const assigneeColor = assigneeInitiales ? getTechColor(assigneeInitiales).color : undefined

  // Calcule le style premium (pastel Apple-style) du badge de priorité
  const renderPriorityBadge = () => {
    if (todo.priorite === 'haute') {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[rgba(255,59,48,0.15)] flex items-center gap-1">
          <span className="size-1 rounded-full bg-[var(--color-danger)]" />
          HAUTE
        </span>
      )
    }
    if (todo.priorite === 'moyenne') {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[rgba(255,159,10,0.15)] flex items-center gap-1">
          <span className="size-1 rounded-full bg-[var(--color-warning)]" />
          MOYENNE
        </span>
      )
    }
    return (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] flex items-center gap-1">
        <span className="size-1 rounded-full bg-[var(--color-neutral)]" />
        BASSE
      </span>
    )
  }

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className={`group flex items-start gap-3.5 p-4 rounded-xl border transition-all ${
        isCompleted
          ? 'bg-[var(--color-bg-primary)]/50 opacity-60 border-[var(--color-border-subtle)]'
          : 'bg-[var(--color-bg-secondary)] border-[var(--color-border-subtle)] shadow-sm hover:shadow-md hover:-translate-y-[0.5px] duration-200'
      }`}
    >
      {/* Checkbox ronde Apple-style */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isCompleted ? 'Marquer comme non terminé' : 'Marquer comme terminé'}
        className="mt-0.5 shrink-0 flex items-center justify-center size-5.5 rounded-full border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
        style={{
          borderColor: isCompleted ? 'var(--color-success)' : 'var(--color-border)',
          background: isCompleted ? 'var(--color-success-light)' : 'transparent',
          color: 'var(--color-success)',
        }}
      >
        {isCompleted && <Check size={11} strokeWidth={3.5} />}
      </button>

      {/* Détails */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2">
          <p
            className={`text-[13px] font-bold transition-colors leading-snug ${
              isCompleted ? 'line-through text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'
            }`}
          >
            {todo.titre}
          </p>
          
          {renderPriorityBadge()}

          {!isCompleted && todo.statut === 'en_cours' && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[rgba(255,159,10,0.15)] flex items-center gap-1">
              <span className="size-1 rounded-full bg-current shrink-0 animate-pulse" />
              EN COURS
            </span>
          )}
        </div>

        {todo.description && (
          <p className={`text-[11px] mt-1 font-medium leading-relaxed ${isCompleted ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-secondary)]'}`}>
            {todo.description}
          </p>
        )}

        {/* Liaisons & Échéance */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-2.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
          {todo.dueDate && (
            (() => {
              const overdue = !isCompleted && isOverdue(todo.dueDate)
              return (
                <span
                  className={`flex items-center gap-1 shrink-0 ${
                    overdue
                      ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[rgba(255,59,48,0.15)] px-2 py-0.5 rounded-full font-bold'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  <Calendar size={11} className={overdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-tertiary)]'} />
                  <span>{todo.dueDate.split('-').reverse().join('/')}</span>
                  {overdue && <span className="text-[9px]">(en retard)</span>}
                </span>
              )
            })()
          )}

          {todo.clientNom && (
            <>
              {todo.dueDate && <span className="text-[var(--color-text-tertiary)] font-normal">•</span>}
              <button
                type="button"
                className="hover:underline font-bold shrink-0 text-left flex items-center gap-1 text-[var(--color-accent)] cursor-pointer"
                onClick={() => navigate(`/missions/${todo.clientId}`)}
              >
                <Briefcase size={11} className="text-[var(--color-accent)] opacity-70 shrink-0" />
                <span>{todo.clientNom}</span>
              </button>
            </>
          )}

          {todo.equipementNom && (
            <>
              {(todo.dueDate || todo.clientNom) && <span className="text-[var(--color-text-tertiary)] font-normal">•</span>}
              <button
                type="button"
                className="hover:underline font-bold shrink-0 text-left flex items-center gap-1 text-[var(--color-accent)] cursor-pointer"
                onClick={() => navigate(`/materiel/${todo.equipementId}`)}
              >
                <Wrench size={11} className="text-[var(--color-accent)] opacity-70 shrink-0" />
                <span>{todo.equipementNom}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Actions & Assigné */}
      <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-3 relative pl-2">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Modifier la tâche"
            className="p-1 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none cursor-pointer"
          >
            <Edit2 size={12} strokeWidth={2.5} />
          </button>
          
          {isCnfDelete ? (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
              <button
                type="button"
                onClick={onDelete}
                className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[rgba(255,59,48,0.15)] hover:bg-[rgba(255,59,48,0.12)] transition-colors cursor-pointer"
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border-subtle)] transition-colors cursor-pointer"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDeletingId(todo.id)}
              aria-label="Supprimer la tâche"
              className="p-1 rounded-md hover:bg-[var(--color-danger-light)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] focus:outline-none cursor-pointer"
            >
              <Trash2 size={12} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {assigneeInitiales && (
          <div className="mt-auto pl-1 pb-0.5" title={todo.assignedToNom || 'Équipe'}>
            <UserAvatar 
              initiales={assigneeInitiales} 
              color={assigneeColor} 
              size={22} 
            />
          </div>
        )}
      </div>
    </m.div>
  )
}
