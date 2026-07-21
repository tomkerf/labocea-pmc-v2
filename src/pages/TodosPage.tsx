import { useMemo, useReducer } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ListTodo, ChevronLeft } from 'lucide-react'
import { useTodosStore } from '@/stores/todosStore'
import { useMissionsStore } from '@/stores/missionsStore'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useUsersStore } from '@/stores/usersStore'
import { useAuthStore, selectUid, selectAppUser } from '@/stores/authStore'
import { createTodo, saveTodo, deleteTodo } from '@/services/todoService'
import { SkeletonList } from '@/components/ui/Skeleton'
import { toast } from '@/stores/toastStore'
import TodoFormModal from '@/components/todos/TodoFormModal'
import TodoSection from '@/components/todos/TodoSection'
import TodoFilters from '@/components/todos/TodoFilters'
import { formReducer, initialFormState } from '@/components/todos/todoFormReducer'
import { pageReducer, initialPageState, sortTasks } from '@/pages/todos/todosPageReducer'
import type { Todo, TodoStatus } from '@/types'

export default function TodosPage() {
  const uid = useAuthStore(selectUid)
  const appUser = useAuthStore(selectAppUser)
  const { todos, loading } = useTodosStore()
  const { clients } = useMissionsStore()
  const { equipements } = useEquipementsStore()
  const users = useUsersStore((s) => s.users)

  const [pageState, pageDispatch] = useReducer(pageReducer, initialPageState)
  const { search, filterTab, filterPriority, showModal, editingTodo, showCompleted, showInProgress, showTodo } = pageState
  const [state, dispatch] = useReducer(formReducer, initialFormState)

  const filteredTodos = useMemo(() => todos.filter((todo) => {
    const q = search.toLowerCase()
    const matchSearch = !q || todo.titre.toLowerCase().includes(q) || todo.description?.toLowerCase().includes(q) || todo.clientNom?.toLowerCase().includes(q) || todo.equipementNom?.toLowerCase().includes(q)
    const matchTab =
      filterTab === 'toutes' ||
      (filterTab === 'mes_taches' && todo.assignedTo === uid) ||
      (filterTab === 'equipe' && (todo.assignedTo === 'equipe' || !todo.assignedTo)) ||
      (filterTab === 'priorite' && (todo.priorite === 'haute' || todo.priorite === 'moyenne'))
    const matchPriority = !filterPriority || todo.priorite === filterPriority
    return matchSearch && matchTab && matchPriority
  }), [todos, search, filterTab, filterPriority, uid])

  const sortedTodo       = useMemo(() => sortTasks(filteredTodos.filter((t) => t.statut === 'a_faire')),    [filteredTodos])
  const sortedInProgress = useMemo(() => sortTasks(filteredTodos.filter((t) => t.statut === 'en_cours')),   [filteredTodos])
  const sortedCompleted  = useMemo(() => filteredTodos.filter((t) => t.statut === 'termine').toSorted((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)), [filteredTodos])

  const listCompleted = useMemo(() => filteredTodos.filter((t) => t.statut === 'termine'), [filteredTodos])

  function openAddModal() {
    pageDispatch({ type: 'OPEN_ADD_MODAL' })
    dispatch({ type: 'RESET_FORM' })
  }

  function openEditModal(todo: Todo) {
    pageDispatch({ type: 'OPEN_EDIT_MODAL', payload: todo })
    dispatch({ type: 'LOAD_TODO', payload: todo })
  }

  async function handleSave() {
    if (!uid || state.saving) return
    if (!state.titre.trim()) {
      toast.error('Le titre de la tâche est obligatoire.')
      return
    }
    dispatch({ type: 'SET_FIELD', field: 'saving', value: true })
    try {
      const selectedUser       = state.assignedTo === 'equipe' ? null : users.find((u) => u.uid === state.assignedTo)
      const selectedClient     = state.clientId ? clients.find((c) => c.id === state.clientId) : null
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
      pageDispatch({ type: 'CLOSE_MODAL' })
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

  const todayStr = new Date().toISOString().split('T')[0]
  const isOverdue = (dueDate?: string) => !!dueDate && dueDate < todayStr

  const sectionProps = {
    onEdit: openEditModal,
    onDelete: handleDelete,
    deletingId: state.deletingId,
    setDeletingId: (id: string | null) => dispatch({ type: 'SET_FIELD', field: 'deletingId', value: id }),
    isOverdue,
  }

  return (
    <div className="p-6 pb-12 max-w-2xl bg-[var(--color-bg-primary)]">
      {/* Bouton retour mobile */}
      <div className="md:hidden mb-4">
        <Link to="/plus" className="inline-flex items-center gap-1 font-semibold text-xs text-[var(--color-accent)] hover:underline transition-opacity active:opacity-85">
          <ChevronLeft size={14} />
          Plus
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Tâches</h1>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] mt-0.5">
            {todos.filter((t) => t.statut !== 'termine').length} tâches actives · {listCompleted.length} terminées
          </p>
        </div>
        <button type="button" onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-sm hover:shadow active:scale-[0.98] cursor-pointer w-full sm:w-auto"
        >
          <Plus size={16} />
          Nouvelle tâche
        </button>
      </div>

      <TodoFilters search={search} filterTab={filterTab} filterPriority={filterPriority} dispatch={pageDispatch} />

      {loading ? (
        <SkeletonList count={3} />
      ) : filteredTodos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl text-center border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] shadow-sm">
          <div className="size-10 rounded-full flex items-center justify-center mb-3 bg-[var(--color-accent-light)] border border-[rgba(0,113,227,0.08)]">
            <ListTodo size={18} className="text-[var(--color-accent)]" />
          </div>
          <p className="text-sm font-bold text-[var(--color-text-primary)]">Aucune tâche trouvée</p>
          <p className="text-xs mt-1.5 max-w-[280px] text-[var(--color-text-secondary)] leading-relaxed font-medium">
            Créez une nouvelle tâche pour planifier vos interventions, calibrations ou autres devoirs.
          </p>
          <button type="button" onClick={openAddModal}
            className="mt-4 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-sm transition-all active:scale-[0.98]"
          >
            + Créer la première tâche
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <TodoSection {...sectionProps} emoji="🔴" label="À faire" todos={sortedTodo}
            visible={showTodo} onToggleVisible={() => pageDispatch({ type: 'TOGGLE_SHOW_TODO' })}
            onToggle={(todo) => handleSetStatus(todo, 'termine')}
            emptyMessage="Aucune tâche à faire dans cette section"
          />
          <TodoSection {...sectionProps} emoji="🟡" label="En cours" todos={sortedInProgress}
            visible={showInProgress} onToggleVisible={() => pageDispatch({ type: 'TOGGLE_SHOW_IN_PROGRESS' })}
            onToggle={(todo) => handleSetStatus(todo, 'termine')}
            emptyMessage="Aucune tâche en cours"
          />
          <TodoSection {...sectionProps} emoji="🟢" label="Terminées" todos={sortedCompleted}
            visible={showCompleted} onToggleVisible={() => pageDispatch({ type: 'TOGGLE_SHOW_COMPLETED' })}
            onToggle={(todo) => handleSetStatus(todo, 'a_faire')}
            emptyMessage="Aucune tâche complétée"
          />
        </div>
      )}

      <TodoFormModal
        showModal={showModal}
        setShowModal={() => pageDispatch({ type: 'CLOSE_MODAL' })}
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
