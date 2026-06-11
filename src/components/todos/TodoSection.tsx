import { AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '@/lib/constants'
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
        className="flex items-center gap-2 w-full text-left font-semibold text-xs uppercase mb-3 focus:outline-none"
        style={{ color: COLORS.TEXT_SECONDARY, letterSpacing: '0.04em' }}
      >
        {visible ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {emoji} {label} ({todos.length})
      </button>

      {visible && (
        <div className="flex flex-col gap-2.5">
          {todos.length === 0 ? (
            <p className="text-xs italic px-4 py-2" style={{ color: 'var(--color-text-tertiary)' }}>
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
