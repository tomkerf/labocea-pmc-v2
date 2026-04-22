import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { doc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveVerification } from '@/hooks/useVerifications'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useAuthStore, selectUid } from '@/stores/authStore'
import type { Verification, TypeVerification, ResultatVerification } from '@/types'

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

const DEBOUNCE = 800

export default function VerificationPage() {
  const { verificationId } = useParams<{ verificationId: string }>()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)

  // Charge les équipements pour la sélection
  useEquipementsListener()
  const { equipements } = useEquipementsStore()

  const [verification, setVerification] = useState<Verification | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!verificationId) return
    const ref = doc(db, 'verifications', verificationId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setVerification({ id: snap.id, ...snap.data() } as Verification)
      else setVerification(null)
      setLoading(false)
    })
    return () => unsub()
  }, [verificationId])

  function triggerSave(updated: Verification) {
    setVerification(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) return
      setSaving(true)
      try {
        await saveVerification(updated, uid)
        // Mise à jour du prochainEtalonnage dans l'équipement concerné
        if (updated.equipementId && updated.prochainControle) {
          await updateDoc(doc(db, 'equipements', updated.equipementId), {
            prochainEtalonnage: updated.prochainControle,
          })
        }
      } finally { setSaving(false) }
    }, DEBOUNCE)
  }

  function update(field: keyof Verification, value: unknown) {
    if (!verification) return
    const updated = { ...verification, [field]: value }
    // Si on change d'équipement, on synchronise aussi le nom
    if (field === 'equipementId') {
      const eq = equipements.find((e) => e.id === value)
      updated.equipementNom = eq?.nom ?? ''
    }
    triggerSave(updated)
  }

  async function handleDelete() {
    if (!verificationId) return
    if (!confirm('Supprimer cette vérification ?')) return
    await deleteDoc(doc(db, 'verifications', verificationId))
    navigate('/metrologie')
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
    </div>
  )
  if (!verification) return (
    <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Vérification introuvable.</div>
  )

  return (
    <div className="p-6 max-w-2xl">
      {/* Retour */}
      <button onClick={() => navigate('/metrologie')}
        className="flex items-center gap-1 text-sm mb-6" style={{ color: 'var(--color-accent)' }}>
        <ChevronLeft size={16} /> Métrologie
      </button>

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {verification.equipementNom || 'Nouvelle vérification'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {verification.date ? new Date(verification.date).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : '—'}
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
        <Field label="Équipement contrôlé" last>
          <select
            value={verification.equipementId}
            onChange={(e) => update('equipementId', e.target.value)}
            className="field-input"
          >
            <option value="">— Sélectionner —</option>
            {equipements.map((e) => (
              <option key={e.id} value={e.id}>{e.nom} {e.numSerie ? `(${e.numSerie})` : ''}</option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Vérification */}
      <Section title="Vérification">
        <Field label="Type">
          <select value={verification.type} onChange={(e) => update('type', e.target.value as TypeVerification)} className="field-input">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Date de vérification">
          <input type="date" value={verification.date} onChange={(e) => update('date', e.target.value)} className="field-input" />
        </Field>
        <Field label="Résultat">
          <select value={verification.resultat} onChange={(e) => update('resultat', e.target.value as ResultatVerification)} className="field-input">
            {RESULTATS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Prochain contrôle" last>
          <input type="date" value={verification.prochainControle} onChange={(e) => update('prochainControle', e.target.value)} className="field-input" />
        </Field>
      </Section>

      {/* Technicien */}
      <Section title="Technicien">
        <Field label="Nom" last>
          <input value={verification.technicienNom} onChange={(e) => update('technicienNom', e.target.value)} className="field-input" placeholder="Nom du technicien" />
        </Field>
      </Section>

      {/* Remarques */}
      <Section title="Remarques">
        <div className="px-5 py-3">
          <textarea
            value={verification.remarques}
            onChange={(e) => update('remarques', e.target.value)}
            rows={3}
            placeholder="Observations, écarts constatés, actions correctives…"
            className="w-full text-sm resize-none bg-transparent outline-none"
            style={{ color: 'var(--color-text-primary)' }}
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
