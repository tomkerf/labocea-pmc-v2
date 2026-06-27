import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveVerification, createVerification } from '@/services/verificationService'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useDocumentData } from '@/hooks/useDocumentData'
import { useAuthStore, selectUid, selectPrenom, selectInitiales, selectRole } from '@/stores/authStore'
import type { Verification, TypeVerification, ResultatVerification } from '@/types'
import { COLLECTIONS, COLORS } from '@/lib/constants'


function addOneYear(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

const TYPES: { value: TypeVerification; label: string }[] = [
  { value: 'etalonnage_interne',   label: 'Étalonnage interne' },
  { value: 'verification_externe', label: 'Vérification externe' },
  { value: 'controle_terrain',     label: 'Contrôle terrain' },
]

const RESULTATS: { value: ResultatVerification; label: string }[] = [
  { value: 'conforme',     label: 'Conforme' },
  { value: 'non_conforme', label: 'Non conforme' },
  { value: 'a_reprendre',  label: 'À reprendre' },
]

function NewVerificationForm() {
  const navigate = useNavigate()
  useEquipementsListener()
  const { equipements } = useEquipementsStore()
  const uid = useAuthStore(selectUid)
  const prenom = useAuthStore(selectPrenom)
  const initiales = useAuthStore(selectInitiales)
  const technicienNom = [prenom, initiales].filter(Boolean).join(' ')
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    equipementId: '', equipementNom: '',
    type: 'etalonnage_interne' as TypeVerification,
    date: today, resultat: 'conforme' as ResultatVerification,
    remarques: '', prochainControle: addOneYear(today),
  })
  const [saving, setSaving] = useState(false)

  function updateField(field: string, value: string) {
    if (field === 'equipementId') {
      const eq = equipements.find((e) => e.id === value)
      setForm((f) => ({ ...f, equipementId: value, equipementNom: eq?.nom ?? '' }))
    } else if (field === 'date') {
      setForm((f) => ({ ...f, date: value, prochainControle: addOneYear(value) }))
    } else {
      setForm((f) => ({ ...f, [field]: value }))
    }
  }

  async function handleCreate() {
    if (!uid || saving) return
    setSaving(true)
    try {
      const id = await createVerification(uid, technicienNom, form)
      navigate(`/metrologie/${id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <button type="button" onClick={() => navigate('/metrologie')}
        className="flex items-center gap-1 text-sm mb-6" style={{ color: COLORS.ACCENT }}>
        <ChevronLeft size={16} /> Métrologie
      </button>
      <h1 className="text-xl font-semibold mb-6" style={{ color: COLORS.TEXT_PRIMARY }}>Nouvelle vérification</h1>
      <Section title="Équipement">
        <Field label="Équipement contrôlé" last>
          <select value={form.equipementId} onChange={(e) => updateField('equipementId', e.target.value)} className="field-input">
            <option value="">— Sélectionner —</option>
            {equipements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}{e.modele && e.modele !== e.nom ? ` ${e.modele}` : ''}{e.diametre ? ` Ø${e.diametre}` : ''}{e.volume ? ` ${e.volume}` : ''}{e.numSerie ? ` (${e.numSerie})` : ''}
              </option>
            ))}
          </select>
        </Field>
      </Section>
      <Section title="Vérification">
        <Field label="Type">
          <select aria-label="Type de vérification" value={form.type} onChange={(e) => updateField('type', e.target.value)} className="field-input">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Date de vérification">
          <input aria-label="Date de vérification" type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} className="field-input" />
        </Field>
        <Field label="Résultat">
          <select aria-label="Résultat" value={form.resultat} onChange={(e) => updateField('resultat', e.target.value)} className="field-input">
            {RESULTATS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Prochain contrôle" last>
          <input aria-label="Prochain contrôle" type="date" value={form.prochainControle} onChange={(e) => updateField('prochainControle', e.target.value)} className="field-input" />
        </Field>
      </Section>
      <Section title="Technicien">
        <Field label="Nom" last>
          <input aria-label="Nom du technicien" value={technicienNom} readOnly className="field-input opacity-60" />
        </Field>
      </Section>
      <Section title="Remarques">
        <div className="px-5 py-3">
          <textarea aria-label="Remarques" value={form.remarques} onChange={(e) => updateField('remarques', e.target.value)}
            rows={3} placeholder="Observations, écarts constatés, actions correctives…"
            className="w-full text-sm resize-none bg-transparent outline-none" style={{ color: COLORS.TEXT_PRIMARY }} />
        </div>
      </Section>
      <button type="button" onClick={handleCreate} disabled={saving}
        className="w-full py-3 rounded-xl text-sm font-semibold mt-2 transition-opacity"
        style={{ background: COLORS.ACCENT, color: 'white', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Création…' : 'Créer la vérification'}
      </button>
    </div>
  )
}

export default function VerificationPage() {
  const { verificationId } = useParams<{ verificationId: string }>()
  const navigate = useNavigate()

  useEquipementsListener()
  const { equipements } = useEquipementsStore()
  const role = useAuthStore(selectRole)

  const { data: verification, loading, saving, triggerSave, handleDelete, confirmDelete, requestDelete, cancelDelete } = useDocumentData<Verification>({
    collection: 'verifications',
    docId: verificationId,
    saveFn: saveVerification,
    onAfterSave: async (updated) => {
      if (updated.equipementId && updated.prochainControle) {
        await updateDoc(doc(db, COLLECTIONS.EQUIPEMENTS, updated.equipementId), {
          prochainEtalonnage: updated.prochainControle,
        })
      }
    },
    deleteRedirect: '/metrologie',
  })

  if (verificationId === 'nouveau') return <NewVerificationForm />

  function update(field: keyof Verification, value: unknown) {
    if (!verification) return
    const updated = { ...verification, [field]: value }
    if (field === 'equipementId') {
      const eq = equipements.find((e) => e.id === value)
      updated.equipementNom = eq?.nom ?? ''
    } else if (field === 'date' && typeof value === 'string') {
      updated.prochainControle = addOneYear(value)
    }
    triggerSave(updated)
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="size-6 rounded-full border-2 animate-spin"
        style={{ borderColor: COLORS.BORDER, borderTopColor: COLORS.ACCENT }} />
    </div>
  )
  if (!verification) return (
    <div className="p-6 text-sm" style={{ color: COLORS.DANGER }}>Vérification introuvable.</div>
  )

  return (
    <div className="p-6 max-w-2xl">
      {/* Retour */}
      <button type="button" onClick={() => navigate('/metrologie')}
        className="flex items-center gap-1 text-sm mb-6" style={{ color: COLORS.ACCENT }}>
        <ChevronLeft size={16} /> Métrologie
      </button>

      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            {verification.equipementNom || 'Nouvelle vérification'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
            {verification.date ? new Date(verification.date).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {saving && <span className="text-xs mr-1" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
          {role === 'admin' && (confirmDelete ? (
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
          ))}
        </div>
      </div>

      {/* Équipement */}
      <Section title="Équipement">
        <Field label="Équipement contrôlé" last>
          <select
            value={verification.equipementId}
            onChange={(e) => update('equipementId', e.target.value)}
            className="field-input"
          >
            <option value="">— Sélectionner —</option>
            {equipements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}{e.modele && e.modele !== e.nom ? ` ${e.modele}` : ''}{e.diametre ? ` Ø${e.diametre}` : ''}{e.volume ? ` ${e.volume}` : ''}{e.numSerie ? ` (${e.numSerie})` : ''}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Vérification */}
      <Section title="Vérification">
        <Field label="Type">
          <select aria-label="Type de vérification" value={verification.type} onChange={(e) => update('type', e.target.value as TypeVerification)} className="field-input">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Date de vérification">
          <input aria-label="Date de vérification" type="date" value={verification.date} onChange={(e) => update('date', e.target.value)} className="field-input" />
        </Field>
        <Field label="Résultat">
          <select aria-label="Résultat de la vérification" value={verification.resultat} onChange={(e) => update('resultat', e.target.value as ResultatVerification)} className="field-input">
            {RESULTATS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Prochain contrôle" last>
          <input aria-label="Prochain contrôle" type="date" value={verification.prochainControle} onChange={(e) => update('prochainControle', e.target.value)} className="field-input" />
        </Field>
      </Section>

      {/* Technicien */}
      <Section title="Technicien">
        <Field label="Nom" last>
          <input aria-label="Nom du technicien" value={verification.technicienNom} onChange={(e) => update('technicienNom', e.target.value)} className="field-input" placeholder="Nom du technicien" />
        </Field>
      </Section>

      {/* Remarques */}
      <Section title="Remarques">
        <div className="px-5 py-3">
          <textarea
            aria-label="Remarques et observations"
            value={verification.remarques}
            onChange={(e) => update('remarques', e.target.value)}
            rows={3}
            placeholder="Observations, écarts constatés, actions correctives…"
            className="w-full text-sm resize-none bg-transparent outline-none"
            style={{ color: COLORS.TEXT_PRIMARY }}
          />
        </div>
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
