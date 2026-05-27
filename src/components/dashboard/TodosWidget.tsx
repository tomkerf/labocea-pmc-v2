import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Todo } from '@/types'
import { saveTodo } from '@/services/todoService'

export function TodosWidget({ todos, uid }: { todos: Todo[]; uid: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // Filtre pour n'afficher que les tâches non terminées attribuées à moi ou à l'équipe
  const pendingTodos = todos.filter(
    (t) => t.statut !== 'termine' && (t.assignedTo === uid || t.assignedTo === 'equipe')
  )

  if (pendingTodos.length === 0) return null

  const sortedTodos = [...pendingTodos].sort((a, b) => {
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

  const prioColors = {
    haute: { text: 'var(--color-danger)', bg: 'var(--color-danger-light)', label: 'Haute' },
    moyenne: { text: 'var(--color-warning)', bg: 'var(--color-warning-light)', label: 'Moyenne' },
    basse: { text: 'var(--color-accent)', bg: 'var(--color-accent-light)', label: 'Basse' },
  }

  // Permet de vérifier si une date d'échéance est dépassée (excluant aujourd'hui)
  const todayStr = new Date().toISOString().split('T')[0]
  function isOverdue(dueDate?: string) {
    if (!dueDate) return false
    return dueDate < todayStr
  }

  return (
    <div className="mb-6">
      <button type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 mb-3 w-full text-left focus:outline-none"
      >
        <span
          className="text-xs font-semibold uppercase"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}
        >
          Mes tâches prioritaires
        </span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
        >
          {pendingTodos.length}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          style={{
            color: 'var(--color-text-tertiary)',
            marginLeft: 'auto',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {open && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <AnimatePresence initial={false}>
              {visibleTodos.map((todo, i) => {
                const colors = prioColors[todo.priorite]
                return (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-3 px-4 py-3 group relative transition-colors hover:bg-neutral-50"
                    style={{
                      borderBottom:
                        i < visibleTodos.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    }}
                  >
                    {/* Checkbox animée */}
                    <button type="button"
                      onClick={() => handleToggleComplete(todo)}
                      className="mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded-md border transition-all cursor-pointer focus:outline-none"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-accent)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent)'
                        e.currentTarget.style.background = 'var(--color-accent-light)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <Check
                        size={12}
                        strokeWidth={3}
                        className="opacity-0 group-hover:opacity-60 transition-opacity"
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-medium truncate cursor-pointer hover:text-[var(--color-accent)] transition-colors"
                          style={{ color: 'var(--color-text-primary)' }}
                          onClick={() => navigate('/todos')}
                        >
                          {todo.titre}
                        </p>
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.2 rounded"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {colors.label}
                        </span>
                      </div>
                      {todo.description && (
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {todo.description}
                        </p>
                      )}

                      {/* Liaisons & Échéance */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        {todo.dueDate && (
                          <span
                            style={{
                              color: isOverdue(todo.dueDate) ? 'var(--color-danger)' : 'inherit',
                              fontWeight: isOverdue(todo.dueDate) ? 600 : 'normal',
                            }}
                          >
                            📅 Échéance : {todo.dueDate} {isOverdue(todo.dueDate) && '(en retard)'}
                          </span>
                        )}
                        {todo.clientNom && (
                          <>
                            {todo.dueDate && <span>•</span>}
                            <span
                              className="hover:underline cursor-pointer font-medium"
                              style={{ color: 'var(--color-accent)' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/missions/${todo.clientId}`)
                              }}
                            >
                              💼 {todo.clientNom}
                            </span>
                          </>
                        )}
                        {todo.equipementNom && (
                          <>
                            {(todo.dueDate || todo.clientNom) && <span>•</span>}
                            <span
                              className="hover:underline cursor-pointer font-medium"
                              style={{ color: 'var(--color-accent)' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/materiel/${todo.equipementId}`)
                              }}
                            >
                              🔧 {todo.equipementNom}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Footer du widget pour aller voir tout */}
          <div
            className="px-4 py-2.5 text-center cursor-pointer hover:bg-neutral-100 transition-colors"
            style={{
              borderTop: '1px solid var(--color-border-subtle)',
              background: 'var(--color-bg-tertiary)',
            }}
            onClick={() => navigate('/todos')}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
              Voir toutes les tâches
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
