import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { doc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveMaintenance } from '@/hooks/useMaintenances'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useAuthStore, selectUid } from '@/stores/authStore'
import type { Maintenance, TypeMaintenance, StatutMaintenance } from '@/types'

const TYPES: { value: TypeMaintenance; label: string }[] = [
  { value: 'preventive', label: 'Préventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'panne',      label: 'Panne' },
]

const STATUTS: { value: StatutMaintenance; label: string }[] = [
  { value: 'planifiee',  label: 'Planifiée' },
  { value: 'en_cours',  label: 'En cours' },
  { value: 'realisee',  label: 'Réalisée' },
  { value: 'abandonnee',label: 'Abandonnée' },
]

const DEBOUNCE = 800

export default function MaintenancePage() {
  const { maintenanceId } = useParams<{ maintenanceId: string }>()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)

  useEquipementsListener()
  const { equipements } = useEquipementsStore()

  const [maintenance, setMaintenance] = useState<Maintenance | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!maintenanceId) return
    const ref = doc(db, 'maintenances', maintenanceId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setMaintenance({ id: snap.id, ...snap.data() } as Maintenance)
      else setMaintenance(null)
      setLoading(false)
    })
    return () => unsub()
  }, [maintenanceId])

  function triggerSave(updated: Maintenance) {
    setMaintenance(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) return
      setSaving(true)
      try {
        await saveMaintenance(updated, uid)
        // Si en_cours → état équipement = en_maintenance
        if (updated.equipementId) {
          if (updated.statut === 'en_cours') {
            await updateDoc(doc(db, 'equipements', updated.equipementId), { etat: 'en_maintenance' })
          } else if (updated.statut === 'realisee' || updated.statut === 'abandonnee') {
            await updateDoc(doc(db, 'equipements', updated.equipementId), { etat: 'operationnel' })
          }
        }
      } finally { setSaving(false) }
    }, DEBOUNCE)
  }

  function update(field: keyof Maintenance, value: unknown) {
    if (!maintenance) return
    const updated = { ...maintenance, [field]: value }
    if (field === 'equipementId') {
      const eq = equipements.find((e) => e.id === value)
      updated.equipementNom = eq?.nom ?? ''
    }
    triggerSave(updated)
  }

  async function handleDelete() {
    if (!maintenanceId) return
    if (!confirm('Supprimer cette intervention ?')) return
    await deleteDoc(doc(db, 'maintenances', maintenanceId))
    navigate('/maintenances')
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
    </div>
  )
  if (!maintenance) return (
    <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Intervention introuvable.</div>
  )

  return (
    <div className="p-6 max-w-2xl">
      {/* Retour */}
      <button onClick={() => navigate('/maintenances')}
        className="flex items-center gap-1 text-sm mb-6" style={{ color: 'var(--color-accent)' }}>
        <ChevronLeft size={16} /> Maintenances
      </button>

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {maintenance.equipementNom || 'Nouvelle intervention'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {maintenance.type === 'preventive' ? 'Maintenance préventive'
              : maintenance.type === 'corrective' ? 'Maintenance corrective'
              : 'Panne'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
          <button onClick={handleDelete}
            className="p-2 rounded-lg"
            style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Équipement */}
      <Section title="Équipement">
        <Field label="Équipement concerné" last>
          <select value={maintenance.equipementId} onChange={(e) => update('equipementId', e.target.value)} className="field-input">
            <option value="">— Sélectionner —</option>
            {equipements.map((e) => (
              <option key={e.id} value={e.id}>{e.nom} {e.numSerie ? `(${e.numSerie})` : ''}</option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Intervention */}
      <Section title="Intervention">
        <Field label="Type">
          <select value={maintenance.type} onChange={(e) => update('type', e.target.value as TypeMaintenance)} className="field-input">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Statut">
          <select value={maintenance.statut} onChange={(e) => update('statut', e.target.value as StatutMaintenance)} className="field-input">
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Date prévue">
          <input type="date" value={maintenance.datePrevue} onChange={(e) => update('datePrevue', e.target.value)} className="field-input" />
        </Field>
        <Field label="Date réalisée">
          <input type="date" value={maintenance.dateRealisee ?? ''} onChange={(e) => update('dateRealisee', e.target.value || null)} className="field-input" />
        </Field>
        <Field label="Durée (heures)" last>
          <input type="number" min="0" step="0.5"
            value={maintenance.dureeHeures ?? ''}
            onChange={(e) => update('dureeHeures', e.target.value ? parseFloat(e.target.value) : null)}
            className="field-input" placeholder="Ex : 2.5" />
        </Field>
      </Section>

      {/* Description */}
      <Section title="Description">
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Problème / motif</p>
          <textarea value={maintenance.description} onChange={(e) => update('description', e.target.value)}
            rows={2} placeholder="Description du problème ou motif de l'intervention…"
            className="w-full text-sm resize-none bg-transparent outline-none" style={{ color: 'var(--color-text-primary)' }} />
        </div>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Travaux réalisés</p>
          <textarea value={maintenance.travauxRealises} onChange={(e) => update('travauxRealises', e.target.value)}
            rows={2} placeholder="Détail des travaux effectués…"
            className="w-full text-sm resize-none bg-transparent outline-none" style={{ color: 'var(--color-text-primary)' }} />
        </div>
        <div className="px-5 py-3">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Pièces remplacées</p>
          <textarea value={maintenance.piecesRemplacees} onChange={(e) => update('piecesRemplacees', e.target.value)}
            rows={2} placeholder="Liste des pièces remplacées…"
            className="w-full text-sm resize-none bg-transparent outline-none" style={{ color: 'var(--color-text-primary)' }} />
        </div>
      </Section>

      {/* Coût + Technicien */}
      <Section title="Informations complémentaires">
        <Field label="Technicien responsable">
          <input value={maintenance.technicienNom} onChange={(e) => update('technicienNom', e.target.value)} className="field-input" placeholder="Nom du technicien" />
        </Field>
        <Field label="Coût (€)" last>
          <input type="number" min="0" step="1"
            value={maintenance.cout ?? ''}
            onChange={(e) => update('cout', e.target.value ? parseFloat(e.target.value) : null)}
            className="field-input" placeholder="—" />
        </Field>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-xs font-semibold uppercase mb-2"
        style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>{title}</h2>
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <label className="text-sm shrink-0" style={{ color: 'var(--color-text-secondary)', minWidth: '180px' }}>{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  )
}
