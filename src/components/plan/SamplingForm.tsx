import { useState, useEffect } from 'react'
import { Plus, Trash2, Camera, X, Loader2, HelpCircle } from 'lucide-react'
import { uploadSamplingPhoto, deleteSamplingPhoto } from '@/lib/uploadPhoto'
import { toast } from '@/stores/toastStore'
import type { AppUser, Sampling, SamplingStatus, NappeType, ChecklistItem } from '@/types'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

// ── SamplingForm ──────────────────────────────────────────────

interface SamplingFormProps {
  sampling: Sampling
  onUpdate: (field: keyof Sampling, value: unknown) => void
  users?: AppUser[]
  clientId: string
  planId: string
}

export function SamplingForm({ sampling, onUpdate, users = [], clientId, planId }: SamplingFormProps) {
  // Auto-remplir rapportDatePrevue = doneDate + 1 mois pour les prélèvements existants
  useEffect(() => {
    if (sampling.rapportPrevu && !sampling.rapportDatePrevue && sampling.doneDate) {
      const d = new Date(sampling.doneDate)
      d.setMonth(d.getMonth() + 1)
      onUpdate('rapportDatePrevue', d.toISOString().slice(0, 10))
    }
  }, [sampling.rapportPrevu, sampling.rapportDatePrevue, sampling.doneDate])
  const [newTask, setNewTask]   = useState('')
  const [uploading, setUploading] = useState(false)

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
        <label className="flex items-center gap-1 text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Statut
          <span className="relative group">
            <HelpCircle size={11} className="cursor-help" style={{ color: 'var(--color-text-tertiary)' }} />
            <div className="absolute bottom-full left-0 mb-1.5 w-60 p-2.5 rounded-lg text-xs z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'var(--color-text-primary)', color: 'white', boxShadow: 'var(--shadow-modal)' }}>
              <p><strong style={{ color: 'var(--color-danger)' }}>En retard</strong> — date dépassée, mais peut encore être réalisé.</p>
              <p className="mt-1.5"><strong style={{ color: 'var(--color-warning)' }}>Non effectué</strong> — définitif. Nécessite un motif. Archive l'intervention.</p>
            </div>
          </span>
        </label>
        <select aria-label="Statut du prélèvement" value={sampling.status}
          onChange={(e) => onUpdate('status', e.target.value as SamplingStatus)}
          className="field-input w-full">
          <option value="planned">Planifié</option>
          <option value="done">Réalisé</option>
          <option value="overdue">En retard</option>
          <option value="non_effectue">Non effectué</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Heure prévue</label>
        <input
          type="time"
          aria-label="Heure prévue"
          value={sampling.plannedTime ?? ''}
          onChange={(e) => onUpdate('plannedTime', e.target.value)}
          className="field-input w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Mois prévu</label>
        <select
          aria-label="Mois prévu"
          value={sampling.plannedMonth}
          onChange={(e) => onUpdate('plannedMonth', parseInt(e.target.value))}
          className="field-input w-full">
          {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Jour prévu
          <span className="ml-1 font-normal" style={{ color: 'var(--color-text-tertiary)' }}>(1–31)</span>
        </label>
        <input
          type="number" min={1} max={31}
          aria-label="Jour prévu"
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
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date réalisée</label>
        <input type="date" aria-label="Date réalisée" value={sampling.doneDate}
          onChange={(e) => onUpdate('doneDate', e.target.value)}
          className="field-input w-full" />
      </div>

      {sampling.status === 'done' && users.length > 0 && (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Effectué par</label>
          <select
            aria-label="Effectué par"
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
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Nappe</label>
        <select aria-label="Nappe" value={sampling.nappe}
          onChange={(e) => onUpdate('nappe', e.target.value as NappeType)}
          className="field-input w-full">
          <option value="">—</option>
          <option value="haute">Haute</option>
          <option value="basse">Basse</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Rapport prévu</label>
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input type="checkbox" aria-label="Rapport prévu" checked={sampling.rapportPrevu}
            onChange={(e) => onUpdate('rapportPrevu', e.target.checked)} />
          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {sampling.rapportPrevu ? 'Oui' : 'Non'}
          </span>
        </label>
      </div>

      {sampling.rapportPrevu && (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date envoi prévue</label>
          <input
            type="date"
            aria-label="Date d'envoi prévue du rapport"
            value={sampling.rapportDatePrevue ?? ''}
            onChange={(e) => onUpdate('rapportDatePrevue', e.target.value)}
            className="field-input w-full"
          />
        </div>
      )}

      <div className="sm:col-span-2">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Commentaire</label>
        <input aria-label="Commentaire" value={sampling.comment}
          onChange={(e) => onUpdate('comment', e.target.value)}
          placeholder="Remarques…"
          className="field-input w-full" />
      </div>

      {/* Checklist */}
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Checklist terrain
        </label>
        {checklist.length > 0 && (
          <div className="rounded-lg overflow-hidden mb-2"
            style={{ border: '1px solid var(--color-border-subtle)' }}>
            {checklist.map((item, i) => (
              <div key={item.id}
                className="flex items-center gap-3 px-3 py-2"
                style={{ borderBottom: i < checklist.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <input type="checkbox" aria-label={`Tâche : ${item.label}`} checked={item.done}
                  onChange={() => toggleTask(item.id)}
                  className="cursor-pointer" />
                <span className="flex-1 text-sm"
                  style={{
                    color: item.done ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>
                  {item.label}
                </span>
                <button type="button" onClick={() => deleteTask(item.id)}
                  aria-label="Supprimer la tâche"
                  className="shrink-0 flex items-center justify-center rounded"
                  style={{ color: 'var(--color-text-tertiary)', minWidth: 44, minHeight: 44 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
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
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Ajouter une tâche…"
            className="field-input flex-1 text-sm"
          />
          <button type="button" onClick={addTask}
            aria-label="Ajouter la tâche"
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Motif — visible uniquement si le prélèvement n'a pas été réalisé */}
      {(sampling.status === 'non_effectue' || sampling.status === 'overdue') && (
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Motif de non-réalisation
          </label>
          <input
            aria-label="Motif de non-réalisation"
            value={sampling.motif ?? ''}
            onChange={(e) => onUpdate('motif', e.target.value)}
            placeholder="Ex : Pas d'eau sur site / Annulation client / Accès impossible…"
            className="field-input w-full"
          />
        </div>
      )}

      {/* Photos terrain */}
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Photos terrain
        </label>

        {(sampling.photos ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {(sampling.photos ?? []).map((url, i) => (
              <div key={url}
                className="relative rounded-lg overflow-hidden shrink-0"
                style={{ width: 96, height: 96, border: '1px solid var(--color-border)' }}>
                <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full">
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover cursor-zoom-in"
                    loading="lazy"
                  />
                </a>
                <button type="button"
                  onClick={() => handlePhotoDelete(url)}
                  aria-label="Supprimer cette photo"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors"
                  title="Supprimer cette photo"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}

        <label
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
          style={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            color: uploading ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
            opacity: uploading ? 0.6 : 1,
            pointerEvents: uploading ? 'none' : 'auto',
          }}
        >
          {uploading
            ? <Loader2 size={14} className="animate-spin" />
            : <Camera size={14} />}
          {uploading ? 'Envoi en cours…' : 'Ajouter une photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  )
}

// ── PlanField ─────────────────────────────────────────────────

export function PlanField({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <label className="text-sm shrink-0" style={{ color: 'var(--color-text-secondary)', minWidth: '160px' }}>
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  )
}
