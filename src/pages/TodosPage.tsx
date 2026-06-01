import { useState, useMemo } from 'react'
import { Plus, Search, Check, ListTodo, ChevronRight, ChevronDown, Edit2, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
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
import type { Todo, TodoPriority, TodoStatus } from '@/types'
import { SkeletonList } from '@/components/ui/Skeleton'
import UserAvatar from '@/components/ui/UserAvatar'
import { getTechColor } from '@/lib/planningUtils'

const prioColors: Record<string, { text: string; bg: string; label: string; icon: string }> = {
  haute:   { text: 'var(--color-text-primary)',   bg: 'var(--color-bg-tertiary)', label: 'Haute',   icon: '!!!' },
  moyenne: { text: 'var(--color-text-primary)',   bg: 'var(--color-bg-tertiary)', label: 'Moyenne', icon: '!!' },
  basse:   { text: 'var(--color-text-secondary)', bg: 'var(--color-bg-tertiary)', label: 'Basse',   icon: '!' },
}

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
  const [formTitre, setFormTitre] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPriority, setFormPriority] = useState<TodoPriority>('moyenne')
  const [formAssignedTo, setFormAssignedTo] = useState<string>('equipe')
  const [formDueDate, setFormDueDate] = useState('')
  const [formClientId, setFormClientId] = useState('')
  const [formEquipementId, setFormEquipementId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null) // Pour confirmation suppression double-étape

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

  // Tri des listes actives
  const sortTasks = (tasks: Todo[]) => {
    return tasks.toSorted((a, b) => {
      // Priorité haute > moyenne > basse
      const prioWeight = { haute: 3, moyenne: 2, basse: 1 }
      const prioA = prioWeight[a.priorite] || 0
      const prioB = prioWeight[b.priorite] || 0
      if (prioB !== prioA) return prioB - prioA

      // Échéance
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
  }

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
    setFormTitre('')
    setFormDesc('')
    setFormPriority('moyenne')
    setFormAssignedTo('equipe')
    setFormDueDate('')
    setFormClientId('')
    setFormEquipementId('')
    setShowModal(true)
  }

  function openEditModal(todo: Todo) {
    setEditingTodo(todo)
    setFormTitre(todo.titre)
    setFormDesc(todo.description || '')
    setFormPriority(todo.priorite)
    setFormAssignedTo(todo.assignedTo || 'equipe')
    setFormDueDate(todo.dueDate || '')
    setFormClientId(todo.clientId || '')
    setFormEquipementId(todo.equipementId || '')
    setShowModal(true)
  }

  async function handleSave() {
    if (!formTitre.trim() || !uid || saving) return
    setSaving(true)
    try {
      const selectedUser = formAssignedTo === 'equipe' ? null : users.find((u) => u.uid === formAssignedTo)
      const selectedClient = formClientId ? clients.find((c) => c.id === formClientId) : null
      const selectedEquipement = formEquipementId ? equipements.find((e) => e.id === formEquipementId) : null

      const partial: Omit<Todo, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
        titre: formTitre.trim(),
        description: formDesc.trim() || undefined,
        statut: editingTodo ? editingTodo.statut : 'a_faire',
        priorite: formPriority,
        assignedTo: formAssignedTo,
        assignedToNom: selectedUser ? `${selectedUser.prenom} ${selectedUser.nom}` : formAssignedTo === 'equipe' ? 'Équipe' : undefined,
        assignedToInitiales: selectedUser ? selectedUser.initiales : undefined,
        dueDate: formDueDate || undefined,
        clientId: formClientId || undefined,
        clientNom: selectedClient ? selectedClient.nom : undefined,
        equipementId: formEquipementId || undefined,
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
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus(todo: Todo) {
    if (!uid) return
    let newStatus: TodoStatus = 'a_faire'
    if (todo.statut === 'a_faire') newStatus = 'en_cours'
    else if (todo.statut === 'en_cours') newStatus = 'termine'
    else newStatus = 'a_faire'

    await saveTodo({ ...todo, statut: newStatus }, uid)
  }

  async function handleSetStatus(todo: Todo, status: TodoStatus) {
    if (!uid) return
    await saveTodo({ ...todo, statut: status }, uid)
  }

  async function handleDelete(todoId: string) {
    try {
      await deleteTodo(todoId)
      setDeletingId(null)
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
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Tâches
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {todos.filter((t) => t.statut !== 'termine').length} tâches actives · {listCompleted.length} terminées
          </p>
        </div>
        <button type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-transform active:scale-95 cursor-pointer"
          style={{ background: 'var(--color-accent)', color: 'white' }}
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
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Onglets coulissants Apple-style */}
          <div
            className="relative flex p-0.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}
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
                  style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-todo-tab"
                      className="absolute inset-0 rounded-md -z-10 shadow-sm"
                      style={{ background: 'var(--color-bg-secondary)' }}
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
              background: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border-subtle)',
              color: 'var(--color-text-primary)',
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
          style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}
        >
          <div className="size-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-accent-light)' }}>
            <ListTodo size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Aucune tâche trouvée
          </p>
          <p className="text-xs mt-1 max-w-[280px]" style={{ color: 'var(--color-text-secondary)' }}>
            Créez une nouvelle tâche pour planifier vos interventions, calibrations ou autres devoirs.
          </p>
          <button type="button"
            onClick={openAddModal}
            className="mt-4 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            style={{ background: 'var(--color-accent)', color: 'white' }}
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
              style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.04em' }}
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
                        prioColors={prioColors}
                        onToggle={() => handleSetStatus(todo, 'termine')}
                        onCycle={() => handleToggleStatus(todo)}
                        onEdit={() => openEditModal(todo)}
                        onDelete={() => handleDelete(todo.id)}
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

          {/* SECTION : EN COURS */}
          <div>
            <button type="button"
              onClick={() => setShowInProgress((s) => !s)}
              className="flex items-center gap-2 w-full text-left font-semibold text-xs uppercase mb-3 focus:outline-none"
              style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.04em' }}
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
                        prioColors={prioColors}
                        onToggle={() => handleSetStatus(todo, 'termine')}
                        onCycle={() => handleToggleStatus(todo)}
                        onEdit={() => openEditModal(todo)}
                        onDelete={() => handleDelete(todo.id)}
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

          {/* SECTION : TERMINÉES */}
          <div>
            <button type="button"
              onClick={() => setShowCompleted((s) => !s)}
              className="flex items-center gap-2 w-full text-left font-semibold text-xs uppercase mb-3 focus:outline-none"
              style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.04em' }}
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
                        prioColors={prioColors}
                        onToggle={() => handleSetStatus(todo, 'a_faire')}
                        onCycle={() => handleToggleStatus(todo)}
                        onEdit={() => openEditModal(todo)}
                        onDelete={() => handleDelete(todo.id)}
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
        </div>
      )}

      {/* MODAL : AJOUT / ÉDITION (Apple Style Zoom) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Overlay flouté */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0"
              style={{ background: 'rgba(0, 0, 0, 0.35)', backdropFilter: 'blur(3px)' }}
              onClick={() => setShowModal(false)}
            />

            {/* Corps Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh]"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <h3 className="text-md font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {editingTodo ? 'Modifier la tâche' : 'Nouvelle tâche'}
                </h3>
                <button type="button"
                  onClick={() => setShowModal(false)}
                  aria-label="Fermer"
                  className="text-gray-400 hover:text-gray-600 font-bold focus:outline-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body (Scrollable) */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                {/* Titre */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Titre de la tâche</label>
                  <input
                    aria-label="Titre de la tâche"
                    value={formTitre}
                    onChange={(e) => setFormTitre(e.target.value)}
                    placeholder="Ex: Préparer flaconnage rivière"
                    className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none"
                    style={{
                      background: 'var(--color-bg-primary)',
                      borderColor: 'var(--color-border-subtle)',
                      color: 'var(--color-text-primary)',
                    }}
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Description / Notes</label>
                  <textarea
                    aria-label="Description / Notes"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Détails supplémentaires, consignes..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none resize-none"
                    style={{
                      background: 'var(--color-bg-primary)',
                      borderColor: 'var(--color-border-subtle)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                {/* Priorité (Segmented Control) */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Priorité</label>
                  <div
                    className="flex p-0.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}
                  >
                    {([
                      { value: 'basse', label: '🔵 Basse' },
                      { value: 'moyenne', label: '🟡 Moyenne' },
                      { value: 'haute', label: '🔴 Haute' },
                    ] as const).map((p) => {
                      const isSel = formPriority === p.value
                      return (
                        <button type="button"
                          key={p.value}
                          onClick={() => setFormPriority(p.value)}
                          className="flex-1 py-2 text-center rounded-md cursor-pointer transition-colors focus:outline-none"
                          style={{
                            color: isSel ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                            background: isSel ? 'var(--color-bg-secondary)' : 'transparent',
                            boxShadow: isSel ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                          }}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Assignation */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Assignée à</label>
                  <select
                    aria-label="Assignée à"
                    value={formAssignedTo}
                    onChange={(e) => setFormAssignedTo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none"
                    style={{
                      background: 'var(--color-bg-primary)',
                      borderColor: 'var(--color-border-subtle)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="equipe">👥 Toute l'équipe (Équipe)</option>
                    {users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        👤 {u.prenom} {u.nom} ({u.initiales})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Échéance */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Date d'échéance</label>
                  <input
                    type="date"
                    aria-label="Date d'échéance"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none"
                    style={{
                      background: 'var(--color-bg-primary)',
                      borderColor: 'var(--color-border-subtle)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  {/* Liaison Client */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Client / Mission</label>
                    <select
                      aria-label="Client / Mission"
                      value={formClientId}
                      onChange={(e) => setFormClientId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none"
                      style={{
                        background: 'var(--color-bg-primary)',
                        borderColor: 'var(--color-border-subtle)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="">(Aucun)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom} ({c.annee})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Liaison Équipement */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Matériel / Instrument</label>
                    <select
                      aria-label="Matériel / Instrument"
                      value={formEquipementId}
                      onChange={(e) => setFormEquipementId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none"
                      style={{
                        background: 'var(--color-bg-primary)',
                        borderColor: 'var(--color-border-subtle)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="">(Aucun)</option>
                      {equipements.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nom}{e.diametre ? ` Ø${e.diametre}` : ''}{e.numSerie ? ` (${e.numSerie})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <button type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-neutral-100 transition-colors focus:outline-none cursor-pointer"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Annuler
                </button>
                <button type="button"
                  onClick={handleSave}
                  disabled={!formTitre.trim() || saving}
                  className="px-5 py-2 text-xs font-semibold rounded-lg cursor-pointer focus:outline-none transition-opacity"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'white',
                    opacity: !formTitre.trim() || saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── COMPOSANT INTERNE : Ligne de tâche (TodoRow) ──
interface TodoRowProps {
  todo: Todo
  prioColors: any
  onToggle: () => void
  onCycle: () => void
  onEdit: () => void
  onDelete: () => void
  deletingId: string | null
  setDeletingId: (id: string | null) => void
  isOverdue: (date?: string) => boolean
  navigate: any
}

function TodoRow({
  todo,
  prioColors,
  onToggle,
  onCycle,
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
    <motion.div
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
          borderColor: isCompleted ? 'var(--color-success)' : 'var(--color-border)',
          background: isCompleted ? 'var(--color-success-light)' : 'transparent',
          color: 'var(--color-success)',
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
            className="text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wide mt-0.5 flex items-center gap-1"
            style={{ background: colors.bg, color: colors.text }}
          >
            <span className="text-[11px]">{colors.icon}</span>
            {colors.label}
          </span>
          {todo.statut === 'en_cours' && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wide mt-0.5"
              style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}
            >
              En cours
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
                color: !isCompleted && isOverdue(todo.dueDate) ? 'var(--color-danger)' : 'inherit',
              }}
            >
              📅 {todo.dueDate.split('-').reverse().join('/')} {!isCompleted && isOverdue(todo.dueDate) && '(en retard)'}
            </span>
          )}

          {todo.clientNom && (
            <>
              {todo.dueDate && <span>•</span>}
              <span
                className="hover:underline cursor-pointer font-semibold shrink-0"
                style={{ color: 'var(--color-accent)' }}
                onClick={() => navigate(`/missions/${todo.clientId}`)}
              >
                💼 {todo.clientNom}
              </span>
            </>
          )}

          {todo.equipementNom && (
            <>
              {(todo.dueDate || todo.clientNom) && <span>•</span>}
              <span
                className="hover:underline cursor-pointer font-semibold shrink-0"
                style={{ color: 'var(--color-accent)' }}
                onClick={() => navigate(`/materiel/${todo.equipementId}`)}
              >
                🔧 {todo.equipementNom}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Assignee & Actions */}
      <div className="shrink-0 flex items-center gap-2 ml-1">
        {/* Badge d'assignation */}
        <div title={todo.assignedToNom || 'Équipe'}>
          {todo.assignedTo === 'equipe' ? (
            <div
              className="flex items-center justify-center text-[9px] font-bold size-6 rounded-full border border-dashed select-none"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              👥
            </div>
          ) : (
            <UserAvatar initiales={assigneeInitiales} color={assigneeColor} size={24} fontSize={9} />
          )}
        </div>

        {/* Boutons d'actions */}
        {!isCompleted && (
          <button type="button"
            onClick={onCycle}
            aria-label={todo.statut === 'a_faire' ? 'Commencer la tâche' : 'Remettre à faire'}
            title={todo.statut === 'a_faire' ? 'Commencer la tâche' : 'Remettre à faire'}
            className="p-1 rounded hover:bg-neutral-100 text-gray-400 hover:text-gray-700 cursor-pointer focus:outline-none transition-colors"
          >
            {todo.statut === 'a_faire' ? (
              <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-blue-50 text-blue-600 uppercase">Faire</span>
            ) : (
              <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-amber-50 text-amber-600 uppercase">Wait</span>
            )}
          </button>
        )}

        <button type="button"
          onClick={onEdit}
          aria-label="Modifier la tâche"
          title="Modifier"
          className="p-1.5 rounded hover:bg-neutral-100 text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none transition-colors opacity-0 group-hover:opacity-100"
        >
          <Edit2 size={13} />
        </button>

        {/* Bouton de suppression double confirmation */}
        <div className="relative">
          {isCnfDelete ? (
            <button type="button"
              onClick={onDelete}
              onMouseLeave={() => setDeletingId(null)}
              className="px-2.5 py-1 text-[10px] font-bold text-white rounded bg-red-500 hover:bg-red-600 focus:outline-none cursor-pointer transition-colors shadow-sm"
            >
              Supprimer ?
            </button>
          ) : (
            <button type="button"
              onClick={() => setDeletingId(todo.id)}
              aria-label="Supprimer la tâche"
              title="Supprimer"
              className="p-1.5 rounded hover:bg-neutral-100 text-gray-400 hover:text-red-500 cursor-pointer focus:outline-none transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
