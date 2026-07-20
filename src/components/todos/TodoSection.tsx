import { AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TodoRow from '@/components/todos/TodoRow'
import type { Todo } from '@/types'

interface TodoSectionProps {
  emoji: string
  label: string
  todos: Todo[]
  visible: boolean
  onToggleVisible: () => void
  onToggle: (todo: Todo) => void
  onEdit: (todo: Todo) => void
  onDelete: (id: string) => void
  deletingId: string | null
  setDeletingId: (id: string | null) => void
  isOverdue: (dueDate?: string) => boolean
  emptyMessage: string
}

export default function TodoSection({
  emoji, label, todos, visible, onToggleVisible,
  onToggle, onEdit, onDelete,
  deletingId, setDeletingId, isOverdue, emptyMessage,
}: TodoSectionProps) {
  const navigate = useNavigate()

  return (
    <div>
      <button
        type="button"
        onClick={onToggleVisible}
        className="flex items-center gap-2 w-full text-left font-bold text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-4 focus:outline-none cursor-pointer"
      >
        {visible ? <ChevronDown size={12} className="text-[var(--color-text-tertiary)]" /> : <ChevronRight size={12} className="text-[var(--color-text-tertiary)]" />}
        <span>{emoji}</span>
        <span>{label}</span>
        <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 rounded-full border border-[var(--color-border-subtle)]">
          {todos.length}
        </span>
      </button>

      {visible && (
        <div className="flex flex-col gap-2.5">
          {todos.length === 0 ? (
            <p className="text-xs font-medium italic px-4 py-3 text-[var(--color-text-tertiary)] bg-[var(--color-bg-secondary)]/50 rounded-xl border border-[var(--color-border-subtle)]">
              {emptyMessage}
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {todos.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  onToggle={() => onToggle(todo)}
                  onEdit={() => onEdit(todo)}
                  onDelete={() => onDelete(todo.id)}
                  deletingId={deletingId}
                  setDeletingId={setDeletingId}
                  isOverdue={isOverdue}
                  navigate={navigate}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  )
}
