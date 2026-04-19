import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveClient } from '@/hooks/useClients'
import { useAuthStore } from '@/stores/authStore'
import { generateId } from '@/lib/ids'
import type { Client, Plan, Sampling, SamplingStatus, FrequenceType, NatureEauType, MethodeType, NappeType, ChecklistItem } from '@/types'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const FREQUENCES: FrequenceType[] = ['Mensuel', 'Bimensuel', 'Trimestriel', 'Semestriel', 'Annuel']
const NATURES: NatureEauType[] = ['Eau usée', 'Rivière', 'Souterraine', 'AEP', 'Marine']
const METHODES: MethodeType[] = ['Ponctuel', 'Composite', 'Automatique']

const STATUS_CONFIG: Record<SamplingStatus, { label: string; bg: string; color: string }> = {
  planned:       { label: 'Planifié',    bg: 'var(--color-bg-tertiary)',    color: 'var(--color-text-secondary)' },
  done:          { label: 'Réalisé',     bg: 'var(--color-success-light)',  color: 'var(--color-success)' },
  overdue:       { label: 'En retard',   bg: 'var(--color-danger-light)',   color: 'var(--color-danger)' },
  non_effectue:  { label: 'Non effectué',bg: 'var(--color-warning-light)',  color: 'var(--color-warning)' },
}

const DEBOUNCE = 800

/** Génère les samplings d'un plan selon sa fréquence */
function generateSamplings(plan: Plan): Sampling[] {
  const months: number[] = []

  if (plan.frequence === 'Mensuel') {
    for (let i = 0; i < 12; i++) months.push(i)
  } else if (plan.frequence === 'Bimensuel') {
    months.push(...(plan.bimensuelMonths.length > 0 ? plan.bimensuelMonths : [0, 2, 4, 6, 8, 10]))
  } else if (plan.frequence === 'Trimestriel') {
    months.push(0, 3, 6, 9)
  } else if (plan.frequence === 'Semestriel') {
    months.push(0, 6)
  } else if (plan.frequence === 'Annuel') {
    months.push(plan.customMonths[0] ?? 0)
  }

  if (plan.customMonths.length > 0 && plan.frequence !== 'Annuel') {
    return plan.customMonths.map((month, i) => ({
      id: generateId(), num: i + 1,
      plannedMonth: month,
      plannedDay: plan.customDays[String(month)] ?? plan.defaultDay,
      status: 'planned', doneDate: '', comment: '',
      nappe: '' as NappeType, rapportPrevu: false, rapportDate: '',
      tente: false, reportHistory: [], doneBy: '',
    }))
  }

  return months.map((month, i) => ({
    id: generateId(), num: i + 1,
    plannedMonth: month,
    plannedDay: plan.customDays[String(month)] ?? plan.defaultDay,
    status: 'planned' as SamplingStatus, doneDate: '', comment: '',
    nappe: '' as NappeType, rapportPrevu: false, rapportDate: '',
    tente: false, reportHistory: [], doneBy: '',
  }))
}

export default function PlanPage() {
  const { clientId, planId } = useParams<{ clientId: string; planId: string }>()
  const navigate = useNavigate()
  const uid = useAuthStore((s) => s.uid())

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSampling, setSelectedSampling] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirty = useRef(false)

  useEffect(() => {
    if (!clientId) return
    const ref = doc(db, 'clients-v2', clientId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists() && !isDirty.current) setClient({ id: snap.id, ...snap.data() } as Client)
      setLoading(false)
    })
    return () => unsub()
  }, [clientId])

  const plan = client?.plans.find((p) => p.id === planId) ?? null

  function triggerSave(updated: Client) {
    isDirty.current = true
    setClient(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) return
      setSaving(true)
      try { await saveClient(updated, uid) }
      finally { setSaving(false); isDirty.current = false }
    }, DEBOUNCE)
  }

  function updatePlan(field: keyof Plan, value: unknown) {
    if (!client || !plan) return
    const updatedPlan = { ...plan, [field]: value }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updatedPlan : p) })
  }

  function updateSampling(samplingId: string, field: keyof Sampling, value: unknown) {
    if (!client || !plan) return
    const uid_ = uid ?? ''
    const updatedSamplings = plan.samplings.map((s) =>
      s.id === samplingId ? { ...s, [field]: value, ...(field === 'status' && value === 'done' ? { doneBy: uid_ } : {}) } : s
    )
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? { ...p, samplings: updatedSamplings } : p) })
  }

  function generateSamplingsForPlan() {
    if (!client || !plan) return
    if (!confirm(`Générer les prélèvements pour fréquence "${plan.frequence}" ? Les prélèvements existants seront remplacés.`)) return
    const newSamplings = generateSamplings(plan)
    const updatedPlan = { ...plan, samplings: newSamplings }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updatedPlan : p) })
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} /></div>
  if (!client || !plan) return <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Point introuvable.</div>

  return (
    <div className="p-6 max-w-2xl">
      {/* Retour */}
      <button onClick={() => navigate(`/missions/${clientId}`)}
        className="flex items-center gap-1 text-sm mb-6" style={{ color: 'var(--color-accent)' }}>
        <ChevronLeft size={16} /> {client.nom}
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {plan.nom || 'Point sans nom'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {plan.siteNom || 'Site non renseigné'}
          </p>
        </div>
        {saving && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
      </div>

      {/* Config du plan */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          Configuration
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <PlanField label="Nom du point">
            <input value={plan.nom} onChange={(e) => updatePlan('nom', e.target.value)} className="field-input" />
          </PlanField>
          <PlanField label="Site">
            <input value={plan.siteNom} onChange={(e) => updatePlan('siteNom', e.target.value)} className="field-input" placeholder="Nom du site" />
          </PlanField>
          <PlanField label="Fréquence">
            <select value={plan.frequence} onChange={(e) => updatePlan('frequence', e.target.value as FrequenceType)} className="field-input">
              {FREQUENCES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </PlanField>
          <PlanField label="Nature de l'eau">
            <select value={plan.nature} onChange={(e) => updatePlan('nature', e.target.value as NatureEauType)} className="field-input">
              {NATURES.map((n) => <option key={n}>{n}</option>)}
            </select>
          </PlanField>
          <PlanField label="Méthode" last>
            <select value={plan.methode} onChange={(e) => updatePlan('methode', e.target.value as MethodeType)} className="field-input">
              {METHODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </PlanField>
        </div>
      </div>

      {/* Calendrier des prélèvements */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Prélèvements {new Date().getFullYear()}
          </h2>
          <button onClick={generateSamplingsForPlan}
            className="text-sm px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            Générer
          </button>
        </div>

        {plan.samplings.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Aucun prélèvement — clique sur "Générer" pour créer le calendrier automatiquement.
          </p>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {plan.samplings.map((s, i) => {
              const cfg = STATUS_CONFIG[s.status]
              const isSelected = selectedSampling === s.id
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setSelectedSampling(isSelected ? null : s.id)}
                    className="w-full flex items-center gap-4 px-5 py-3 text-left transition-colors"
                    style={{ borderBottom: '1px solid var(--color-border-subtle)', background: isSelected ? 'var(--color-accent-light)' : 'transparent' }}
                  >
                    <span className="text-sm font-medium w-6 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                      {s.num}
                    </span>
                    <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>
                      {MOIS[s.plannedMonth]}{s.plannedDay ? ` — j${s.plannedDay}` : ''}
                    </span>
                    {s.doneDate && (
                      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        {new Date(s.doneDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </button>

                  {/* Formulaire inline du prélèvement */}
                  {isSelected && (
                    <div className="px-5 py-4" style={{ background: 'var(--color-bg-tertiary)', borderBottom: i < plan.samplings.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                      <SamplingForm sampling={s} onUpdate={(field, val) => updateSampling(s.id, field, val)} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Formulaire prélèvement ──────────────────────────────────

interface SamplingFormProps {
  sampling: Sampling
  onUpdate: (field: keyof Sampling, value: unknown) => void
}

function SamplingForm({ sampling, onUpdate }: SamplingFormProps) {
  const [newTask, setNewTask] = useState('')
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
    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Statut</label>
        <select value={sampling.status}
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
          value={sampling.plannedTime ?? ''}
          onChange={(e) => onUpdate('plannedTime', e.target.value)}
          className="field-input w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Mois prévu</label>
        <select
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
        <input type="date" value={sampling.doneDate}
          onChange={(e) => onUpdate('doneDate', e.target.value)}
          className="field-input w-full" />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Nappe</label>
        <select value={sampling.nappe}
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
          <input type="checkbox" checked={sampling.rapportPrevu}
            onChange={(e) => onUpdate('rapportPrevu', e.target.checked)} />
          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {sampling.rapportPrevu ? 'Oui' : 'Non'}
          </span>
        </label>
      </div>

      {sampling.rapportPrevu && (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date rapport</label>
          <input type="date" value={sampling.rapportDate}
            onChange={(e) => onUpdate('rapportDate', e.target.value)}
            className="field-input w-full" />
        </div>
      )}

      <div className="col-span-2">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Commentaire</label>
        <input value={sampling.comment}
          onChange={(e) => onUpdate('comment', e.target.value)}
          placeholder="Remarques…"
          className="field-input w-full" />
      </div>

      {/* Checklist */}
      <div className="col-span-2">
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
                <input type="checkbox" checked={item.done}
                  onChange={() => toggleTask(item.id)}
                  className="cursor-pointer" />
                <span className="flex-1 text-sm"
                  style={{
                    color: item.done ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>
                  {item.label}
                </span>
                <button onClick={() => deleteTask(item.id)}
                  className="shrink-0 p-1 rounded"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Ajouter une tâche…"
            className="field-input flex-1 text-sm"
          />
          <button onClick={addTask}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            <Plus size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function PlanField({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
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
