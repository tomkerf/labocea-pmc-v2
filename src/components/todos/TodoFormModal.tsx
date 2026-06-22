import type React from 'react'
import BaseModal from '@/components/ui/BaseModal'
import { COLORS } from '@/lib/constants'
import type { FormState, FormAction } from './todoFormReducer'
import type { Todo, AppUser, Client, Equipement } from '@/types'

interface TodoFormModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  editingTodo: Todo | null;
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  handleSave: () => void;
  users: AppUser[];
  clients: Client[];
  equipements: Equipement[];
}

export default function TodoFormModal({
  showModal,
  setShowModal,
  editingTodo,
  state,
  dispatch,
  handleSave,
  users,
  clients,
  equipements,
}: TodoFormModalProps) {
  return (
    <BaseModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      title={editingTodo ? 'Modifier la tâche' : 'Nouvelle tâche'}
      footer={
        <>
          <button type="button"
            onClick={() => setShowModal(false)}
            className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-neutral-100 transition-colors focus:outline-none cursor-pointer"
            style={{ color: COLORS.TEXT_SECONDARY }}
          >
            Annuler
          </button>
          <button type="button"
            onClick={handleSave}
            disabled={state.saving}
            className="px-5 py-2 text-xs font-semibold rounded-lg cursor-pointer focus:outline-none transition-opacity"
            style={{
              background: COLORS.ACCENT,
              color: 'white',
              opacity: state.saving ? 0.6 : 1,
            }}
          >
            {state.saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Titre */}
        <div>
          <label htmlFor="todo-titre" className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Titre de la tâche</label>
          <input
            id="todo-titre"
            value={state.titre}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'titre', value: e.target.value })}
            placeholder="Ex: Préparer flaconnage rivière"
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none"
            style={{
              background: COLORS.BG_PRIMARY,
              borderColor: 'var(--color-border-subtle)',
              color: COLORS.TEXT_PRIMARY,
            }}

          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="todo-desc" className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Description / Notes</label>
          <textarea
            id="todo-desc"
            value={state.desc}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'desc', value: e.target.value })}
            placeholder="Détails supplémentaires, consignes..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none resize-none"
            style={{
              background: COLORS.BG_PRIMARY,
              borderColor: 'var(--color-border-subtle)',
              color: COLORS.TEXT_PRIMARY,
            }}
          />
        </div>

        {/* Priorité (Segmented Control) */}
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Priorité</legend>
          <div
            className="flex p-0.5 rounded-lg text-xs font-semibold"
            style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)' }}
          >
            {([
              { value: 'basse', label: '🔵 Basse' },
              { value: 'moyenne', label: '🟡 Moyenne' },
              { value: 'haute', label: '🔴 Haute' },
            ] as const).map((p) => {
              const isSel = state.priorite === p.value
              return (
                <button type="button"
                  key={p.value}
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'priorite', value: p.value })}
                  className="flex-1 py-2 text-center rounded-md cursor-pointer transition-colors focus:outline-none"
                  style={{
                    color: isSel ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
                    background: isSel ? COLORS.BG_SECONDARY : 'transparent',
                    boxShadow: isSel ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Assignation */}
        <div>
          <label htmlFor="todo-assigned" className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Assignée à</label>
          <select
            id="todo-assigned"
            value={state.assignedTo}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'assignedTo', value: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none"
            style={{
              background: COLORS.BG_PRIMARY,
              borderColor: 'var(--color-border-subtle)',
              color: COLORS.TEXT_PRIMARY,
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
          <label htmlFor="todo-due-date" className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Date d'échéance</label>
          <input
            id="todo-due-date"
            type="date"
            value={state.dueDate}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'dueDate', value: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none"
            style={{
              background: COLORS.BG_PRIMARY,
              borderColor: 'var(--color-border-subtle)',
              color: COLORS.TEXT_PRIMARY,
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-1">
          {/* Liaison Client */}
          <div>
            <label htmlFor="todo-client" className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Client / Mission</label>
            <select
              id="todo-client"
              value={state.clientId}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'clientId', value: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none"
              style={{
                background: COLORS.BG_PRIMARY,
                borderColor: 'var(--color-border-subtle)',
                color: COLORS.TEXT_PRIMARY,
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
            <label htmlFor="todo-equipement" className="block text-[11px] font-semibold uppercase mb-1 text-gray-500">Matériel / Instrument</label>
            <select
              id="todo-equipement"
              value={state.equipementId}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'equipementId', value: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none"
              style={{
                background: COLORS.BG_PRIMARY,
                borderColor: 'var(--color-border-subtle)',
                color: COLORS.TEXT_PRIMARY,
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
    </BaseModal>
  )
}
