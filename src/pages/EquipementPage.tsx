import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2, AlertTriangle } from 'lucide-react'
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveEquipement } from '@/hooks/useEquipements'
import { useAuthStore } from '@/stores/authStore'
import CircleProgress from '@/components/materiel/CircleProgress'
import type { Equipement, CategorieType, EtatType, LocalisationType, MateriauFlacon } from '@/types'

const CATEGORIES: { value: CategorieType; label: string }[] = [
  { value: 'preleveur',     label: 'Préleveur'      },
  { value: 'debitmetre',    label: 'Débitmètre'     },
  { value: 'multiparametre',label: 'Multiparamètre' },
  { value: 'glaciere',      label: 'Glacière'       },
  { value: 'enregistreur',  label: 'Enregistreur'   },
  { value: 'thermometre',   label: 'Thermomètre'    },
  { value: 'reglet',        label: 'Réglet'         },
  { value: 'eprouvette',    label: 'Éprouvette'     },
  { value: 'flacon',        label: 'Flacon'         },
  { value: 'pompe_pz',      label: 'Pompe PZ'       },
  { value: 'sonde_niveau',  label: 'Sonde niveau'   },
  { value: 'chronometre',   label: 'Chronomètre'    },
]

const ETATS: { value: EtatType; label: string }[] = [
  { value: 'operationnel', label: 'Opérationnel' },
  { value: 'en_maintenance', label: 'En maintenance' },
  { value: 'hors_service', label: 'Hors service' },
  { value: 'prete', label: 'Prêté' },
]

const LOCALISATIONS: { value: LocalisationType; label: string }[] = [
  { value: 'labo', label: 'Laboratoire' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'externe', label: 'Externe (prêt / SAV)' },
]

const DEBOUNCE = 800

function calcMetroPercent(prochainEtalonnage: string): number | null {
  if (!prochainEtalonnage) return null
  const now = Date.now()
  const next = new Date(prochainEtalonnage).getTime()
  if (next <= now) return 0
  return Math.min(100, Math.round(((next - now) / (365 * 24 * 60 * 60 * 1000)) * 100))
}

export default function EquipementPage() {
  const { equipementId } = useParams<{ equipementId: string }>()
  const navigate = useNavigate()
  const uid = useAuthStore((s) => s.uid())

  const [equipement, setEquipement] = useState<Equipement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!equipementId) return
    const ref = doc(db, 'equipements', equipementId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setEquipement({ id: snap.id, ...snap.data() } as Equipement)
      else setEquipement(null)
      setLoading(false)
    })
    return () => unsub()
  }, [equipementId])

  function triggerSave(updated: Equipement) {
    setEquipement(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) return
      setSaving(true)
      try { await saveEquipement(updated, uid) }
      finally { setSaving(false) }
    }, DEBOUNCE)
  }

  function update(field: keyof Equipement, value: unknown) {
    if (!equipement) return
    triggerSave({ ...equipement, [field]: value })
  }

  async function handleDelete() {
    if (!equipementId) return
    if (!confirm(`Supprimer "${equipement?.nom || 'cet équipement'}" ? Cette action est irréversible.`)) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await deleteDoc(doc(db, 'equipements', equipementId))
    navigate('/materiel')
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
    </div>
  )
  if (!equipement) return (
    <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Équipement introuvable.</div>
  )

  const metroPercent = calcMetroPercent(equipement.prochainEtalonnage)
  const isMetroOverdue = equipement.prochainEtalonnage
    ? new Date(equipement.prochainEtalonnage).getTime() < Date.now()
    : false
  const metroOverdueDays = isMetroOverdue
    ? Math.floor((Date.now() - new Date(equipement.prochainEtalonnage).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="p-6 max-w-2xl">
      {/* Retour */}
      <button onClick={() => navigate('/materiel')}
        className="flex items-center gap-1 text-sm mb-6" style={{ color: 'var(--color-accent)' }}>
        <ChevronLeft size={16} /> Matériel
      </button>

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          {/* Anneau métrologie grand format */}
          {metroPercent !== null ? (
            <CircleProgress
              percent={metroPercent}
              size={64}
              strokeWidth={4}
              label="métrologie"
            />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>—</span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {equipement.nom || 'Nouvel équipement'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {[equipement.marque, equipement.modele].filter(Boolean).join(' ') || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
          <button onClick={handleDelete}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)' }}
            title="Supprimer">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Alerte étalonnage en retard */}
      {isMetroOverdue && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
          style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
            Étalonnage en retard de {metroOverdueDays} jour{metroOverdueDays > 1 ? 's' : ''}
            {' '}— prévu le {new Date(equipement.prochainEtalonnage).toLocaleDateString('fr-FR')}
          </p>
        </div>
      )}

      {/* Identification */}
      <Section title="Identification">
        <Field label="Nom de l'équipement">
          <input value={equipement.nom} onChange={(e) => update('nom', e.target.value)} className="field-input" placeholder="Ex : YSI Pro30" />
        </Field>
        <Field label="Marque">
          <input value={equipement.marque} onChange={(e) => update('marque', e.target.value)} className="field-input" placeholder="Ex : YSI" />
        </Field>
        <Field label="Modèle">
          <input value={equipement.modele} onChange={(e) => update('modele', e.target.value)} className="field-input" placeholder="Ex : Pro30" />
        </Field>
        <Field label="Numéro de série">
          <input value={equipement.numSerie} onChange={(e) => update('numSerie', e.target.value)} className="field-input" placeholder="Ex : A123456" />
        </Field>
        <Field label="Catégorie">
          <select value={equipement.categorie} onChange={(e) => update('categorie', e.target.value as CategorieType)} className="field-input">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Date d'acquisition" last>
          <input type="date" value={equipement.dateAcquisition} onChange={(e) => update('dateAcquisition', e.target.value)} className="field-input" />
        </Field>
      </Section>

      {/* État et localisation */}
      <Section title="État et localisation">
        <Field label="État">
          <select value={equipement.etat} onChange={(e) => update('etat', e.target.value as EtatType)} className="field-input">
            {ETATS.map((et) => <option key={et.value} value={et.value}>{et.label}</option>)}
          </select>
        </Field>
        <Field label="Localisation" last>
          <select value={equipement.localisation} onChange={(e) => update('localisation', e.target.value as LocalisationType)} className="field-input">
            {LOCALISATIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </Field>
      </Section>

      {/* Métrologie */}
      <Section title="Métrologie">
        <Field label="Prochain étalonnage" last>
          <input type="date" value={equipement.prochainEtalonnage} onChange={(e) => update('prochainEtalonnage', e.target.value)} className="field-input" />
        </Field>
      </Section>

      {/* Caractéristiques flacon */}
      {equipement.categorie === 'flacon' && (
        <Section title="Caractéristiques flacon">
          <Field label="Volume">
            <input
              value={equipement.volume ?? ''}
              onChange={(e) => update('volume', e.target.value)}
              className="field-input"
              placeholder="Ex : 20L, 1L, 500 mL"
            />
          </Field>
          <Field label="Matériau">
            <select
              value={equipement.materiau ?? ''}
              onChange={(e) => update('materiau', e.target.value as MateriauFlacon)}
              className="field-input"
            >
              <option value="">— Non renseigné</option>
              <option value="plastique">Plastique</option>
              <option value="verre">Verre</option>
            </select>
          </Field>
          <Field label="Poids" last>
            <input
              value={equipement.poids ?? ''}
              onChange={(e) => update('poids', e.target.value)}
              className="field-input"
              placeholder="Ex : 0.570 kg"
            />
          </Field>
        </Section>
      )}

      {/* Notes */}
      <Section title="Notes">
        <div className="px-5 py-3">
          <textarea
            value={equipement.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={3}
            placeholder="Remarques, historique, informations complémentaires…"
            className="w-full text-sm resize-none bg-transparent outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
        </div>
      </Section>
    </div>
  )
}

// ── Composants helpers ──────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-xs font-semibold uppercase mb-2"
        style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
        {title}
      </h2>
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
      <label className="text-sm shrink-0" style={{ color: 'var(--color-text-secondary)', minWidth: '180px' }}>
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  )
}
