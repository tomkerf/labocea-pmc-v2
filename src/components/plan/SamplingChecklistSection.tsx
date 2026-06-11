import { Plus, Trash2 } from 'lucide-react'
import type { ChecklistItem } from '@/types'
import { COLORS } from '@/lib/constants'

interface SamplingChecklistSectionProps {
  checklist: ChecklistItem[]
  newTask: string
  onNewTaskChange: (value: string) => void
  onAddTask: () => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
}

export default function SamplingChecklistSection({
  checklist, newTask, onNewTaskChange, onAddTask, onToggleTask, onDeleteTask,
}: SamplingChecklistSectionProps) {
  return (
    <div className="sm:col-span-2">
      <p className="block text-xs font-medium mb-2" style={{ color: COLORS.TEXT_SECONDARY }}>
        Checklist terrain
      </p>
      {checklist.length > 0 && (
        <div className="rounded-lg overflow-hidden mb-2"
          style={{ border: '1px solid var(--color-border-subtle)' }}>
          {checklist.map((item, i) => (
            <div key={item.id}
              className="flex items-center gap-3 px-3 py-2"
              style={{ borderBottom: i < checklist.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
              <input type="checkbox" aria-label={`Tâche : ${item.label}`} checked={item.done}
                onChange={() => onToggleTask(item.id)}
                className="cursor-pointer" />
              <span className="flex-1 text-sm"
                style={{
                  color: item.done ? 'var(--color-text-tertiary)' : COLORS.TEXT_PRIMARY,
                  textDecoration: item.done ? 'line-through' : 'none',
                }}>
                {item.label}
              </span>
              <button type="button" onClick={() => onDeleteTask(item.id)}
                aria-label="Supprimer la tâche"
                className="shrink-0 flex items-center justify-center rounded"
                style={{ color: 'var(--color-text-tertiary)', minWidth: 44, minHeight: 44 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.DANGER)}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          aria-label="Nouvelle tâche"
          value={newTask}
          onChange={(e) => onNewTaskChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddTask()}
          placeholder="Ajouter une tâche…"
          className="field-input flex-1 text-sm"
        />
        <button type="button" onClick={onAddTask}
          aria-label="Ajouter la tâche"
          className="px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
          <Plus size={15} />
        </button>
      </div>
    </div>
  )
}
