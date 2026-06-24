import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveMaintenance } from '@/services/maintenanceService'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useDocumentData } from '@/hooks/useDocumentData'
import type { Maintenance, TypeMaintenance, StatutMaintenance } from '@/types'
import { COLLECTIONS, COLORS } from '@/lib/constants'


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

export default function MaintenancePage() {
  const { maintenanceId } = useParams<{ maintenanceId: string }>()
  const navigate = useNavigate()

  useEquipementsListener()
  const { equipements } = useEquipementsStore()

  const { data: maintenance, loading, saving, triggerSave, handleDelete, confirmDelete, requestDelete, cancelDelete } = useDocumentData<Maintenance>({
    collection: 'maintenances',
    docId: maintenanceId,
    saveFn: saveMaintenance,
    onAfterSave: async (updated) => {
      if (!updated.equipementId) return
      if (updated.statut === 'en_cours') {
        await updateDoc(doc(db, COLLECTIONS.EQUIPEMENTS, updated.equipementId), { etat: 'en_maintenance' })
      } else if (updated.statut === 'realisee' || updated.statut === 'abandonnee') {
        await updateDoc(doc(db, COLLECTIONS.EQUIPEMENTS, updated.equipementId), { etat: 'operationnel' })
      }
    },
    deleteRedirect: '/maintenances',
  })

  function update(field: keyof Maintenance, value: unknown) {
    if (!maintenance) return
    const updated = { ...maintenance, [field]: value }
    if (field === 'equipementId') {
      const eq = equipements.find((e) => e.id === value)
      updated.equipementNom = eq?.nom ?? ''
    }
    triggerSave(updated)
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="size-6 rounded-full border-2 animate-spin"
        style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
    </div>
  )
  if (!maintenance) return (
    <div className="p-6 text-sm" style={{ color: COLORS.DANGER }}>Intervention introuvable.</div>
  )

  return (
    <div className="p-6 max-w-2xl">
      {/* Retour */}
      <button type="button" onClick={() => navigate('/maintenances')}
        className="flex items-center gap-1 text-sm mb-6" style={{ color: COLORS.ACCENT }}>
        <ChevronLeft size={16} /> Maintenances
      </button>

      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            {maintenance.equipementNom || 'Nouvelle intervention'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
            {maintenance.type === 'preventive' ? 'Maintenance préventive'
              : maintenance.type === 'corrective' ? 'Maintenance corrective'
              : 'Panne'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {saving && <span className="text-xs mr-1" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={handleDelete} className="text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: COLORS.DANGER, color: 'white' }}>Supprimer</button>
              <button type="button" onClick={cancelDelete} className="text-sm px-2 py-1.5 rounded-lg"
                style={{ color: COLORS.TEXT_SECONDARY }}>Annuler</button>
            </div>
          ) : (
            <button type="button" onClick={requestDelete} className="p-2 rounded-lg"
              style={{ color: COLORS.DANGER, background: 'var(--color-danger-light)' }}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Équipement */}
      <Section title="Équipement">
        <Field label="Équipement concerné" last>
          <select value={maintenance.equipementId} onChange={(e) => update('equipementId', e.target.value)} className="field-input">
            <option value="">— Sélectionner —</option>
            {equipements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}{e.modele && e.modele !== e.nom ? ` ${e.modele}` : ''}{e.diametre ? ` Ø${e.diametre}` : ''}{e.volume ? ` ${e.volume}` : ''}{e.numSerie ? ` (${e.numSerie})` : ''}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Intervention */}
      <Section title="Intervention">
        <Field label="Type">
          <select aria-label="Type d'intervention" value={maintenance.type} onChange={(e) => update('type', e.target.value as TypeMaintenance)} className="field-input">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Statut">
          <select aria-label="Statut de la maintenance" value={maintenance.statut} onChange={(e) => update('statut', e.target.value as StatutMaintenance)} className="field-input">
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Date prévue">
          <input aria-label="Date prévue" type="date" value={maintenance.datePrevue} onChange={(e) => update('datePrevue', e.target.value)} className="field-input" />
        </Field>
        <Field label="Date réalisée">
          <input aria-label="Date réalisée" type="date" value={maintenance.dateRealisee ?? ''} onChange={(e) => update('dateRealisee', e.target.value || null)} className="field-input" />
        </Field>
        <Field label="Durée (heures)" last>
          <input aria-label="Durée en heures" type="number" min="0" step="0.5"
            value={maintenance.dureeHeures ?? ''}
            onChange={(e) => update('dureeHeures', e.target.value ? parseFloat(e.target.value) : null)}
            className="field-input" placeholder="Ex : 2.5" />
        </Field>
      </Section>

      {/* Description */}
      <Section title="Description">
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Problème / motif</p>
          <textarea value={maintenance.description} onChange={(e) => update('description', e.target.value)}
            rows={2} placeholder="Description du problème ou motif de l'intervention…"
            aria-label="Problème ou motif de l'intervention"
            className="w-full text-sm resize-none bg-transparent outline-none" style={{ color: COLORS.TEXT_PRIMARY }} />
        </div>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Travaux réalisés</p>
          <textarea value={maintenance.travauxRealises} onChange={(e) => update('travauxRealises', e.target.value)}
            rows={2} placeholder="Détail des travaux effectués…"
            aria-label="Travaux réalisés"
            className="w-full text-sm resize-none bg-transparent outline-none" style={{ color: COLORS.TEXT_PRIMARY }} />
        </div>
        <div className="px-5 py-3">
          <p className="text-xs font-medium mb-1" style={{ color: COLORS.TEXT_SECONDARY }}>Pièces remplacées</p>
          <textarea value={maintenance.piecesRemplacees} onChange={(e) => update('piecesRemplacees', e.target.value)}
            rows={2} placeholder="Liste des pièces remplacées…"
            aria-label="Pièces remplacées"
            className="w-full text-sm resize-none bg-transparent outline-none" style={{ color: COLORS.TEXT_PRIMARY }} />
        </div>
      </Section>

      {/* Coût + Technicien */}
      <Section title="Informations complémentaires">
        <Field label="Technicien responsable">
          <input aria-label="Technicien responsable" value={maintenance.technicienNom} onChange={(e) => update('technicienNom', e.target.value)} className="field-input" placeholder="Nom du technicien" />
        </Field>
        <Field label="Coût (€)" last>
          <input aria-label="Coût en euros" type="number" min="0" step="1"
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
        style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <label className="flex items-center gap-4 px-5 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <span className="text-sm shrink-0" style={{ color: COLORS.TEXT_SECONDARY, minWidth: '180px' }}>{label}</span>
      <div className="flex-1">{children}</div>
    </label>
  )
}
