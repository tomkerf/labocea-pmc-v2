import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveVerification } from '@/services/verificationService'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useDocumentData } from '@/hooks/useDocumentData'
import type { Verification, TypeVerification, ResultatVerification } from '@/types'
import { COLLECTIONS, COLORS } from '@/lib/constants'


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

export default function VerificationPage() {
  const { verificationId } = useParams<{ verificationId: string }>()
  const navigate = useNavigate()

  useEquipementsListener()
  const { equipements } = useEquipementsStore()

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

  function update(field: keyof Verification, value: unknown) {
    if (!verification) return
    const updated = { ...verification, [field]: value }
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
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
            {verification.equipementNom || 'Nouvelle vérification'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
            {verification.date ? new Date(verification.date).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : '—'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
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
