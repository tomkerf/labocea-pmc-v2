import { useState, useMemo, useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ListTodo, ChevronRight, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodosListener } from '@/hooks/useTodos'
import { useClientsListener } from '@/hooks/useClients'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useUsersListener } from '@/hooks/useUsers'
import { useTodosStore } from '@/stores/todosStore'
import { useMissionsStore } from '@/stores/missionsStore'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useUsersStore } from '@/stores/usersStore'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { createTodo, saveTodo, deleteTodo } from '@/services/todoService'
import type { Todo, TodoStatus } from '@/types'

const PRIO_WEIGHT: Record<string, number> = { haute: 3, moyenne: 2, basse: 1 }

function sortTasks(tasks: Todo[]) {
  return tasks.toSorted((a, b) => {
    const prioA = PRIO_WEIGHT[a.priorite] || 0
    const prioB = PRIO_WEIGHT[b.priorite] || 0
    if (prioB !== prioA) return prioB - prioA
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })
}
import { SkeletonList } from '@/components/ui/Skeleton'
import { COLORS } from '@/lib/constants'
import { toast } from '@/stores/toastStore'
import TodoRow from '@/components/todos/TodoRow'
import TodoFormModal from '@/components/todos/TodoFormModal'
import { formReducer, initialFormState } from '@/components/todos/todoFormReducer'

export default function TodosPage() {
  // ── Listeners ──
  useTodosListener()
  useClientsListener()
  useEquipementsListener()
  useUsersListener()

  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)
  const appUser = useAuthStore((s) => s.appUser)

  // ── Stores ──
  const { todos, loading } = useTodosStore()
  const { clients } = useMissionsStore()
  const { equipements } = useEquipementsStore()
  const users = useUsersStore((s) => s.users)

  // ── States ──
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'toutes' | 'mes_taches' | 'equipe'>('toutes')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  
  // Section folding states
  const [showCompleted, setShowCompleted] = useState(false)
  const [showInProgress, setShowInProgress] = useState(true)
  const [showTodo, setShowTodo] = useState(true)

  // Form states
  const [state, dispatch] = useReducer(formReducer, initialFormState)

  // ── Filtres et Tris ──
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        todo.titre.toLowerCase().includes(q) ||
        todo.description?.toLowerCase().includes(q) ||
        todo.clientNom?.toLowerCase().includes(q) ||
        todo.equipementNom?.toLowerCase().includes(q)

      const matchTab =
        filterTab === 'toutes' ||
        (filterTab === 'mes_taches' && todo.assignedTo === uid) ||
        (filterTab === 'equipe' && (todo.assignedTo === 'equipe' || !todo.assignedTo))

      const matchPriority = !filterPriority || todo.priorite === filterPriority

      return matchSearch && matchTab && matchPriority
    })
  }, [todos, search, filterTab, filterPriority, uid])

  // Séparation par statut
  const listTodo = useMemo(() => filteredTodos.filter((t) => t.statut === 'a_faire'), [filteredTodos])
  const listInProgress = useMemo(() => filteredTodos.filter((t) => t.statut === 'en_cours'), [filteredTodos])
  const listCompleted = useMemo(() => filteredTodos.filter((t) => t.statut === 'termine'), [filteredTodos])

  const sortedTodo = useMemo(() => sortTasks(listTodo), [listTodo])
  const sortedInProgress = useMemo(() => sortTasks(listInProgress), [listInProgress])
  
  // Les terminées sont triées par updatedAt inverse (les plus récemment fermées en premier)
  const sortedCompleted = useMemo(() => {
    return listCompleted.toSorted((a, b) => {
      const timeA = a.updatedAt?.toMillis() || 0
      const timeB = b.updatedAt?.toMillis() || 0
      return timeB - timeA
    })
  }, [listCompleted])

  // ── Actions ──
  function openAddModal() {
    setEditingTodo(null)
    dispatch({ type: 'RESET_FORM' })
    setShowModal(true)
  }

  function openEditModal(todo: Todo) {
    setEditingTodo(todo)
    dispatch({ type: 'LOAD_TODO', payload: todo })
    setShowModal(true)
  }

  async function handleSave() {
    if (!state.titre.trim() || !uid || state.saving) return
    dispatch({ type: 'SET_FIELD', field: 'saving', value: true })
    try {
      const selectedUser = state.assignedTo === 'equipe' ? null : users.find((u) => u.uid === state.assignedTo)
      const selectedClient = state.clientId ? clients.find((c) => c.id === state.clientId) : null
      const selectedEquipement = state.equipementId ? equipements.find((e) => e.id === state.equipementId) : null

      const partial: Omit<Todo, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
        titre: state.titre.trim(),
        description: state.desc.trim() || undefined,
        statut: editingTodo ? editingTodo.statut : 'a_faire',
        priorite: state.priorite,
        assignedTo: state.assignedTo,
        assignedToNom: selectedUser ? `${selectedUser.prenom} ${selectedUser.nom}` : state.assignedTo === 'equipe' ? 'Équipe' : undefined,
        assignedToInitiales: selectedUser ? selectedUser.initiales : undefined,
        dueDate: state.dueDate || undefined,
        clientId: state.clientId || undefined,
        clientNom: selectedClient ? selectedClient.nom : undefined,
        equipementId: state.equipementId || undefined,
        equipementNom: selectedEquipement ? selectedEquipement.nom : undefined,
        createdByNom: appUser ? `${appUser.prenom} ${appUser.nom}` : undefined,
      }

      if (editingTodo) {
        await saveTodo({ ...editingTodo, ...partial } as Todo, uid)
      } else {
        await createTodo(uid, partial)
      }
      setShowModal(false)
    } catch (e) {
      console.error(e)
      toast.error('Erreur lors de la sauvegarde. Vérifie ta connexion.')
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'saving', value: false })
    }
  }

  async function handleSetStatus(todo: Todo, status: TodoStatus) {
    if (!uid) return
    await saveTodo({ ...todo, statut: status }, uid)
  }

  async function handleDelete(todoId: string) {
    try {
      await deleteTodo(todoId)
      dispatch({ type: 'SET_FIELD', field: 'deletingId', value: null })
    } catch (e) {
      console.error(e)
    }
  }

  // Helper date dépassée
  const todayStr = new Date().toISOString().split('T')[0]
  function isOverdue(dueDate?: string) {
    if (!dueDate) return false
    return dueDate < todayStr
  }

  return (
    <div className="p-6 pb-12 max-w-2xl">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            Tâches
          </h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
            {todos.filter((t) => t.statut !== 'termine').length} tâches actives · {listCompleted.length} terminées
          </p>
        </div>
        <button type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-transform active:scale-95 cursor-pointer"
          style={{ background: COLORS.ACCENT, color: 'white' }}
        >
          <Plus size={16} />
          Nouvelle tâche
        </button>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher une tâche"
            placeholder="Rechercher une tâche par titre, client, matériel..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            style={{
              background: COLORS.BG_SECONDARY,
              border: '1px solid var(--color-border-subtle)',
              color: COLORS.TEXT_PRIMARY,
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Onglets coulissants Apple-style */}
          <div
            className="relative flex p-0.5 rounded-lg text-xs font-medium"
            style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)' }}
          >
            {([
              { id: 'toutes', label: 'Toutes' },
              { id: 'mes_taches', label: 'Miennes' },
              { id: 'equipe', label: 'Équipe' },
            ] as const).map((tab) => {
              const isActive = filterTab === tab.id
              return (
                <button type="button"
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className="relative z-10 px-3.5 py-1.5 rounded-md transition-colors cursor-pointer focus:outline-none"
                  style={{ color: isActive ? COLORS.ACCENT : COLORS.TEXT_SECONDARY }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-todo-tab"
                      className="absolute inset-0 rounded-md -z-10 shadow-sm"
                      style={{ background: COLORS.BG_SECONDARY }}
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Filtre Priorité */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            aria-label="Filtrer par priorité"
            className="px-3 py-1.5 rounded-lg text-xs border"
            style={{
              background: COLORS.BG_SECONDARY,
              borderColor: 'var(--color-border-subtle)',
              color: COLORS.TEXT_PRIMARY,
            }}
          >
            <option value="">Toutes priorités</option>
            <option value="haute">🔴 Haute</option>
            <option value="moyenne">🟡 Moyenne</option>
            <option value="basse">🔵 Basse</option>
          </select>
        </div>
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : filteredTodos.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 px-4 rounded-xl text-center border-2 border-dashed"
          style={{ borderColor: 'var(--color-border-subtle)', background: COLORS.BG_SECONDARY }}
        >
          <div className="size-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-accent-light)' }}>
            <ListTodo size={20} style={{ color: COLORS.ACCENT }} />
          </div>
          <p className="text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>
            Aucune tâche trouvée
          </p>
          <p className="text-xs mt-1 max-w-[280px]" style={{ color: COLORS.TEXT_SECONDARY }}>
            Créez une nouvelle tâche pour planifier vos interventions, calibrations ou autres devoirs.
          </p>
          <button type="button"
            onClick={openAddModal}
            className="mt-4 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            style={{ background: COLORS.ACCENT, color: 'white' }}
          >
            + Créer la première tâche
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* SECTION : À FAIRE */}
          <div>
            <button type="button"
              onClick={() => setShowTodo((s) => !s)}
              className="flex items-center gap-2 w-full text-left font-semibold text-xs uppercase mb-3 focus:outline-none"
              style={{ color: COLORS.TEXT_SECONDARY, letterSpacing: '0.04em' }}
            >
              {showTodo ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              🔴 À faire ({sortedTodo.length})
            </button>

            {showTodo && (
              <div className="flex flex-col gap-2.5">
                {sortedTodo.length === 0 ? (
                  <p className="text-xs italic px-4 py-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    Aucune tâche à faire dans cette section
                  </p>
                ) : (
                  <AnimatePresence initial={false}>
                    {sortedTodo.map((todo) => (
                      <TodoRow
                        key={todo.id}
                        todo={todo}
                        onToggle={() => handleSetStatus(todo, 'termine')}
                        onEdit={() => openEditModal(todo)}
                        onDelete={() => handleDelete(todo.id)}
                        deletingId={state.deletingId}
                        setDeletingId={(id) => dispatch({ type: 'SET_FIELD', field: 'deletingId', value: id })}
                        isOverdue={isOverdue}
                        navigate={navigate}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            )}
          </div>

          {/* SECTION : EN COURS */}
          <div>
            <button type="button"
              onClick={() => setShowInProgress((s) => !s)}
              className="flex items-center gap-2 w-full text-left font-semibold text-xs uppercase mb-3 focus:outline-none"
              style={{ color: COLORS.TEXT_SECONDARY, letterSpacing: '0.04em' }}
            >
              {showInProgress ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              🟡 En cours ({sortedInProgress.length})
            </button>

            {showInProgress && (
              <div className="flex flex-col gap-2.5">
                {sortedInProgress.length === 0 ? (
                  <p className="text-xs italic px-4 py-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    Aucune tâche en cours
                  </p>
                ) : (
                  <AnimatePresence initial={false}>
                    {sortedInProgress.map((todo) => (
                      <TodoRow
                        key={todo.id}
                        todo={todo}
                        onToggle={() => handleSetStatus(todo, 'termine')}
                        onEdit={() => openEditModal(todo)}
                        onDelete={() => handleDelete(todo.id)}
                        deletingId={state.deletingId}
                        setDeletingId={(id) => dispatch({ type: 'SET_FIELD', field: 'deletingId', value: id })}
                        isOverdue={isOverdue}
                        navigate={navigate}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            )}
          </div>

          {/* SECTION : TERMINÉES */}
          <div>
            <button type="button"
              onClick={() => setShowCompleted((s) => !s)}
              className="flex items-center gap-2 w-full text-left font-semibold text-xs uppercase mb-3 focus:outline-none"
              style={{ color: COLORS.TEXT_SECONDARY, letterSpacing: '0.04em' }}
            >
              {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              🟢 Terminées ({sortedCompleted.length})
            </button>

            {showCompleted && (
              <div className="flex flex-col gap-2.5">
                {sortedCompleted.length === 0 ? (
                  <p className="text-xs italic px-4 py-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    Aucune tâche complétée
                  </p>
                ) : (
                  <AnimatePresence initial={false}>
                    {sortedCompleted.map((todo) => (
                      <TodoRow
                        key={todo.id}
                        todo={todo}
                        onToggle={() => handleSetStatus(todo, 'a_faire')}
                        onEdit={() => openEditModal(todo)}
                        onDelete={() => handleDelete(todo.id)}
                        deletingId={state.deletingId}
                        setDeletingId={(id) => dispatch({ type: 'SET_FIELD', field: 'deletingId', value: id })}
                        isOverdue={isOverdue}
                        navigate={navigate}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL : AJOUT / ÉDITION (Apple Style Zoom) */}
      <TodoFormModal
        showModal={showModal}
        setShowModal={setShowModal}
        editingTodo={editingTodo}
        state={state}
        dispatch={dispatch}
        handleSave={handleSave}
        users={users}
        clients={clients}
        equipements={equipements}
      />
    </div>
  )
}
