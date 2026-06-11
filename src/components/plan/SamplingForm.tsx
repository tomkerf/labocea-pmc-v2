import { useState, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import { uploadSamplingPhoto, deleteSamplingPhoto } from '@/lib/uploadPhoto'
import { toast } from '@/stores/toastStore'
import type { AppUser, Sampling, SamplingStatus, NappeType, ChecklistItem } from '@/types'
import { COLORS } from '@/lib/constants'
import { useEquipementsStore } from '@/stores/equipementsStore'
import SamplingPhotosSection from './SamplingPhotosSection'
import SamplingChecklistSection from './SamplingChecklistSection'


const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const EMPTY_USERS: AppUser[] = []

// ── SamplingForm ──────────────────────────────────────────────

interface SamplingFormProps {
  sampling: Sampling
  onUpdate: (field: keyof Sampling, value: unknown) => void
  users?: AppUser[]
  clientId: string
  planId: string
}

export function SamplingForm({ sampling, onUpdate, users = EMPTY_USERS, clientId, planId }: SamplingFormProps) {
  // Auto-remplir rapportDatePrevue = doneDate + 1 mois pour les prélèvements existants
  useEffect(() => {
    if (sampling.rapportPrevu && !sampling.rapportDatePrevue && sampling.doneDate) {
      const d = new Date(sampling.doneDate)
      d.setMonth(d.getMonth() + 1)
      onUpdate('rapportDatePrevue', d.toISOString().slice(0, 10))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampling.rapportPrevu, sampling.rapportDatePrevue, sampling.doneDate])
  const [newTask, setNewTask]   = useState('')
  const [uploading, setUploading] = useState(false)
  const equipements = useEquipementsStore(s => s.equipements)
  const assignedEqs = sampling.equipementsAssignes ?? []
  const assignedEqDetails = equipements.filter(eq => assignedEqs.includes(eq.id))

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadSamplingPhoto(file, clientId, planId, sampling.id)
      onUpdate('photos', [...(sampling.photos ?? []), url])
    } catch {
      toast.error('Échec de l\'envoi de la photo. Vérifie ta connexion.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handlePhotoDelete(url: string) {
    onUpdate('photos', (sampling.photos ?? []).filter((u) => u !== url))
    await deleteSamplingPhoto(url)
  }

  const checklist: ChecklistItem[] = sampling.checklist ?? []

  function addTask() {
    const label = newTask.trim()
    if (!label) return
    const item: ChecklistItem = { id: crypto.randomUUID(), label, done: false }
    onUpdate('checklist', [...checklist, item])
    setNewTask('')
  }

  function toggleTask(id: string) {
    onUpdate('checklist', checklist.map((t) => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTask(id: string) {
    onUpdate('checklist', checklist.filter((t) => t.id !== id))
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      <div>
        <label htmlFor="sf-status" className="flex items-center gap-1 text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
          Statut
          <span className="relative group">
            <HelpCircle size={11} className="cursor-help" style={{ color: 'var(--color-text-tertiary)' }} />
            <div className="absolute bottom-full left-0 mb-1.5 w-60 p-2.5 rounded-lg text-xs z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: COLORS.TEXT_PRIMARY, color: 'white', boxShadow: 'var(--shadow-modal)' }}>
              <p><strong style={{ color: COLORS.DANGER }}>En retard</strong> — date dépassée, mais peut encore être réalisé.</p>
              <p className="mt-1.5"><strong style={{ color: COLORS.WARNING }}>Non effectué</strong> — définitif. Nécessite un motif. Archive l'intervention.</p>
            </div>
          </span>
        </label>
        <select id="sf-status" value={sampling.status}
          onChange={(e) => onUpdate('status', e.target.value as SamplingStatus)}
          className="field-input w-full">
          <option value="planned">Planifié</option>
          <option value="done">Réalisé</option>
          <option value="overdue">En retard</option>
          <option value="non_effectue">Non effectué</option>
        </select>
      </div>

      <div>
        <label htmlFor="sf-planned-time" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Heure prévue</label>
        <input
          id="sf-planned-time"
          type="time"
          value={sampling.plannedTime ?? ''}
          onChange={(e) => onUpdate('plannedTime', e.target.value)}
          className="field-input w-full"
        />
      </div>

      <div>
        <label htmlFor="sf-planned-month" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Mois prévu</label>
        <select
          id="sf-planned-month"
          value={sampling.plannedMonth}
          onChange={(e) => onUpdate('plannedMonth', parseInt(e.target.value))}
          className="field-input w-full">
          {MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="sf-planned-day" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
          Jour prévu
          <span className="ml-1 font-normal" style={{ color: 'var(--color-text-tertiary)' }}>(1–31)</span>
        </label>
        <input
          id="sf-planned-day"
          type="number" min={1} max={31}
          value={sampling.plannedDay || ''}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            if (!isNaN(v) && v >= 1 && v <= 31) onUpdate('plannedDay', v)
            else if (e.target.value === '') onUpdate('plannedDay', 0)
          }}
          className="field-input w-full"
          placeholder="Ex : 15"
        />
      </div>

      <div>
        <label htmlFor="sf-done-date" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Date réalisée</label>
        <input id="sf-done-date" type="date" value={sampling.doneDate}
          onChange={(e) => onUpdate('doneDate', e.target.value)}
          className="field-input w-full" />
      </div>

      {sampling.status === 'done' && users.length > 0 && (
        <div>
          <label htmlFor="sf-done-by" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Effectué par</label>
          <select
            id="sf-done-by"
            value={sampling.doneBy ?? ''}
            onChange={(e) => onUpdate('doneBy', e.target.value)}
            className="field-input w-full">
            <option value="">— Sélectionner —</option>
            {users.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.prenom} {u.nom} ({u.initiales})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="sf-nappe" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Nappe</label>
        <select id="sf-nappe" value={sampling.nappe}
          onChange={(e) => onUpdate('nappe', e.target.value as NappeType)}
          className="field-input w-full">
          <option value="">—</option>
          <option value="haute">Haute</option>
          <option value="basse">Basse</option>
        </select>
      </div>

      <div>
        <p className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Rapport prévu</p>
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input type="checkbox" aria-label="Rapport prévu" checked={sampling.rapportPrevu}
            onChange={(e) => onUpdate('rapportPrevu', e.target.checked)} />
          <span className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>
            {sampling.rapportPrevu ? 'Oui' : 'Non'}
          </span>
        </label>
      </div>

      {sampling.rapportPrevu && (
        <div>
          <label htmlFor="sf-rapport-date" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Date envoi prévue</label>
          <input
            id="sf-rapport-date"
            type="date"
            value={sampling.rapportDatePrevue ?? ''}
            onChange={(e) => onUpdate('rapportDatePrevue', e.target.value)}
            className="field-input w-full"
          />
        </div>
      )}

      <div className="sm:col-span-2">
        <label htmlFor="sf-comment" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Commentaire</label>
        <input id="sf-comment" value={sampling.comment}
          onChange={(e) => onUpdate('comment', e.target.value)}
          placeholder="Remarques…"
          className="field-input w-full" />
      </div>

      {assignedEqDetails.length > 0 && (
        <div className="sm:col-span-2">
          <p className="block text-xs font-medium mb-2" style={{ color: COLORS.TEXT_SECONDARY }}>
            Matériel assigné pour la tournée
          </p>
          <div className="flex flex-col gap-2">
            {assignedEqDetails.map(eq => (
              <div key={eq.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: COLORS.TEXT_PRIMARY }}>{eq.nom}</p>
                  <p className="text-xs truncate" style={{ color: COLORS.TEXT_SECONDARY }}>{eq.marque} - {eq.numSerie}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SamplingChecklistSection
        checklist={checklist}
        newTask={newTask}
        onNewTaskChange={setNewTask}
        onAddTask={addTask}
        onToggleTask={toggleTask}
        onDeleteTask={deleteTask}
      />

      {/* Motif — visible uniquement si le prélèvement n'a pas été réalisé */}
      {(sampling.status === 'non_effectue' || sampling.status === 'overdue') && (
        <div className="sm:col-span-2">
          <label htmlFor="sf-motif" className="block text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>
            Motif de non-réalisation
          </label>
          <input
            id="sf-motif"
            value={sampling.motif ?? ''}
            onChange={(e) => onUpdate('motif', e.target.value)}
            placeholder="Ex : Pas d'eau sur site / Annulation client / Accès impossible…"
            className="field-input w-full"
          />
        </div>
      )}

      <SamplingPhotosSection
        photos={sampling.photos ?? []}
        uploading={uploading}
        onPhotoChange={handlePhotoChange}
        onPhotoDelete={handlePhotoDelete}
      />
    </div>
  )
}

// ── PlanField ─────────────────────────────────────────────────

export function PlanField({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <label className="flex items-center gap-4 px-5 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <span className="text-sm shrink-0" style={{ color: COLORS.TEXT_SECONDARY, minWidth: '160px' }}>
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </label>
  )
}
