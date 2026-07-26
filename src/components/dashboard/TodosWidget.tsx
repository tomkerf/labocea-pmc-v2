import { useNavigate } from 'react-router-dom'
import { Check, CalendarClock, Briefcase, Wrench } from 'lucide-react'
import { m, AnimatePresence } from 'framer-motion'
import type { Todo } from '@/types'
import { saveTodo } from '@/services/todoService'
import { SectionTitle } from '@/components/dashboard/StatCard'

const prioColors: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  haute:   { bg: 'bg-[var(--color-bg-tertiary)]', text: 'text-[var(--color-text-primary)]',   label: 'Haute',   icon: '!!!' },
  moyenne: { bg: 'bg-[var(--color-bg-tertiary)]', text: 'text-[var(--color-text-primary)]',   label: 'Moyenne', icon: '!!' },
  basse:   { bg: 'bg-[var(--color-bg-tertiary)]', text: 'text-[var(--color-text-secondary)]', label: 'Basse',   icon: '!' },
}

export function TodosWidget({ todos, uid }: { todos: Todo[]; uid: string }) {
  const navigate = useNavigate()

  // Filtre pour n'afficher que les tâches non terminées attribuées à moi ou à l'équipe
  const pendingTodos = todos.filter(
    (t) => t.statut !== 'termine' && (t.assignedTo === uid || t.assignedTo === 'equipe')
  )

  if (pendingTodos.length === 0) return null

  const sortedTodos = pendingTodos.toSorted((a, b) => {
    // Trier par priorité : haute > moyenne > basse
    const prioWeight = { haute: 3, moyenne: 2, basse: 1 }
    const prioA = prioWeight[a.priorite] || 0
    const prioB = prioWeight[b.priorite] || 0
    if (prioB !== prioA) return prioB - prioA

    // Puis par date d'échéance
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })

  // Prendre les 5 plus prioritaires
  const visibleTodos = sortedTodos.slice(0, 5)

  async function handleToggleComplete(todo: Todo) {
    const updated: Todo = {
      ...todo,
      statut: 'termine',
    }
    await saveTodo(updated, uid)
  }

  // Permet de vérifier si une date d'échéance est dépassée (excluant aujourd'hui)
  const todayStr = new Date().toISOString().split('T')[0]
  function isOverdue(dueDate?: string) {
    if (!dueDate) return false
    return dueDate < todayStr
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <SectionTitle>Mes tâches prioritaires</SectionTitle>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
          {pendingTodos.length}
        </span>
      </div>

      <div className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]">
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          <AnimatePresence initial={false}>
            {visibleTodos.map((todo, i) => {
              const colors = prioColors[todo.priorite]
              return (
                <m.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-3 px-4 py-3 group relative transition-colors hover:bg-[var(--color-bg-tertiary)] overflow-hidden ${
                    i < visibleTodos.length - 1 ? 'border-b border-[var(--color-border-subtle)]' : ''
                  }`}
                >
                  {/* Checkbox animée */}
                  <button type="button"
                    onClick={() => handleToggleComplete(todo)}
                    aria-label="Marquer comme terminé"
                    className="mt-0.5 shrink-0 flex items-center justify-center size-5 rounded-md border transition-colors cursor-pointer focus:outline-none border-[var(--color-border)] text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
                  >
                    <Check
                      size={12}
                      strokeWidth={3}
                      className="opacity-0 group-hover:opacity-60 transition-opacity"
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button type="button"
                        className="text-sm font-medium truncate cursor-pointer hover:text-[var(--color-accent)] transition-colors text-left focus:outline-none focus-visible:ring-2 text-[var(--color-text-primary)]"
                        onClick={() => navigate('/todos')}
                      >
                        {todo.titre}
                      </button>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded flex items-center gap-1 ${colors.bg} ${colors.text}`}
                      >
                        <span className="text-[11px]">{colors.icon}</span>
                        {colors.label}
                      </span>
                    </div>
                    {todo.description && (
                      <p className="text-xs truncate mt-0.5 text-[var(--color-text-secondary)]">
                        {todo.description}
                      </p>
                    )}

                    {/* Liaisons & Échéance */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                      {todo.dueDate && (
                        <span
                          className={`inline-flex items-center gap-1 ${isOverdue(todo.dueDate) ? 'text-[var(--color-danger)] font-semibold' : ''}`}
                        >
                          <CalendarClock size={12} strokeWidth={1.5} />
                          Échéance : {todo.dueDate.split('-').reverse().join('/')} {isOverdue(todo.dueDate) && '(en retard)'}
                        </span>
                      )}
                      {todo.clientNom && (
                        <>
                          {todo.dueDate && <span>•</span>}
                          <button type="button"
                            className="inline-flex items-center gap-1 hover:underline cursor-pointer font-medium text-left focus:outline-none focus-visible:ring-2 text-[var(--color-accent)]"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/missions/${todo.clientId}`)
                            }}
                          >
                            <Briefcase size={12} strokeWidth={1.5} />
                            {todo.clientNom}
                          </button>
                        </>
                      )}
                      {todo.equipementNom && (
                        <>
                          {(todo.dueDate || todo.clientNom) && <span>•</span>}
                          <button type="button"
                            className="inline-flex items-center gap-1 hover:underline cursor-pointer font-medium text-left focus:outline-none focus-visible:ring-2 text-[var(--color-accent)]"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/materiel/${todo.equipementId}`)
                            }}
                          >
                            <Wrench size={12} strokeWidth={1.5} />
                            {todo.equipementNom}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </m.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Footer du widget pour aller voir tout */}
        <button type="button"
          className="w-full px-4 py-2.5 text-center cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors focus:outline-none focus-visible:ring-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]"
          onClick={() => navigate('/todos')}
        >
          <span className="text-xs font-semibold text-[var(--color-accent)]">
            Voir toutes les tâches
          </span>
        </button>
      </div>
    </div>
  )
}
