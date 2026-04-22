import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2, AlertTriangle, Gauge, Wrench, Package, Clock, Plus, FileText, StickyNote } from 'lucide-react'
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveEquipement } from '@/hooks/useEquipements'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useAuthStore, selectUid, selectInitiales } from '@/stores/authStore'
import CircleProgress from '@/components/materiel/CircleProgress'
import type { Equipement, CategorieType, EtatType, LocalisationType, MateriauFlacon, Verification, Maintenance, FicheDeVieNote } from '@/types'

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
  const uid        = useAuthStore(selectUid)
  const initiales  = useAuthStore(selectInitiales)

  useVerificationsListener()
  useMaintenancesListener()
  const verifications = useMetrologieStore((s) => s.verifications)
  const maintenances  = useMaintenancesStore((s) => s.maintenances)

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

      {/* Fiche de vie */}
      <FicheDeVie
        equipement={equipement}
        verifications={verifications.filter((v) => v.equipementId === equipementId)}
        maintenances={maintenances.filter((m) => m.equipementId === equipementId)}
        onAddNote={(note) => {
          const notes = [...(equipement.ficheDeVieNotes ?? []), note]
          update('ficheDeVieNotes', notes)
        }}
        onDeleteNote={(id) => {
          const notes = (equipement.ficheDeVieNotes ?? []).filter((n) => n.id !== id)
          update('ficheDeVieNotes', notes)
        }}
        initiales={initiales}
      />
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

// ── Fiche de vie ────────────────────────────────────────────

type TimelineEntry =
  | { kind: 'acquisition'; date: string }
  | { kind: 'verification'; date: string; data: Verification }
  | { kind: 'maintenance';  date: string; data: Maintenance }
  | { kind: 'note';         date: string; data: FicheDeVieNote }

const VERIF_TYPE: Record<string, string> = {
  etalonnage_interne: 'Étalonnage interne',
  verification_externe: 'Vérification externe',
  controle_terrain: 'Contrôle terrain',
}
const MAINT_TYPE: Record<string, string> = {
  preventive: 'Maintenance préventive',
  corrective: 'Maintenance corrective',
  panne: 'Panne',
}

function exportFicheDeViePDF(
  equipement: Equipement,
  entries: TimelineEntry[],
) {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const rows = entries.map((e) => {
    if (e.kind === 'acquisition') {
      return `<tr><td>${fmt(e.date)}</td><td>Acquisition</td><td>—</td><td>—</td><td>—</td></tr>`
    }
    if (e.kind === 'verification') {
      const v = e.data
      const resultat = v.resultat === 'conforme' ? '✓ Conforme' : v.resultat === 'non_conforme' ? '✗ Non conforme' : '↻ À reprendre'
      return `<tr><td>${fmt(v.date)}</td><td>Métrologie</td><td>${VERIF_TYPE[v.type] ?? v.type}</td><td>${resultat}</td><td>${[v.technicienNom, v.remarques].filter(Boolean).join(' · ')}</td></tr>`
    }
    if (e.kind === 'maintenance') {
      const m = e.data
      return `<tr><td>${fmt(m.dateRealisee || m.datePrevue)}</td><td>Maintenance</td><td>${MAINT_TYPE[m.type] ?? m.type}</td><td>${m.statut}</td><td>${[m.technicienNom, m.travauxRealises || m.description].filter(Boolean).join(' · ')}</td></tr>`
    }
    // note
    const n = e.data
    return `<tr><td>${fmt(n.date)}</td><td>Note</td><td>${n.titre}</td><td>—</td><td>${[n.auteur, n.notes].filter(Boolean).join(' · ')}</td></tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Fiche de vie — ${equipement.nom}</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 13px; color: #1D1D1F; margin: 40px; }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
  .meta { color: #6E6E73; font-size: 13px; margin-bottom: 24px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #F5F5F7; border-radius: 10px; padding: 16px; margin-bottom: 28px; font-size: 12px; }
  .info-grid dt { color: #6E6E73; }
  .info-grid dd { font-weight: 500; margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 8px 10px; background: #F5F5F7; font-weight: 600; color: #6E6E73; text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; border-bottom: 1px solid #D2D2D7; }
  td { padding: 10px 10px; border-bottom: 1px solid #E5E5EA; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 32px; font-size: 11px; color: #AEAEB2; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${equipement.nom || 'Équipement'}</h1>
<div class="meta">${[equipement.marque, equipement.modele].filter(Boolean).join(' ')} — N° série : ${equipement.numSerie || '—'}</div>
<dl class="info-grid">
  <dt>Catégorie</dt><dd>${equipement.categorie}</dd>
  <dt>État</dt><dd>${equipement.etat}</dd>
  <dt>Localisation</dt><dd>${equipement.localisation}</dd>
  <dt>Date acquisition</dt><dd>${equipement.dateAcquisition ? fmt(equipement.dateAcquisition) : '—'}</dd>
  <dt>Prochain étalonnage</dt><dd>${equipement.prochainEtalonnage ? fmt(equipement.prochainEtalonnage) : '—'}</dd>
  <dt>Notes</dt><dd>${equipement.notes || '—'}</dd>
</dl>
<table>
  <thead><tr><th>Date</th><th>Catégorie</th><th>Type / Titre</th><th>Résultat</th><th>Détails</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" style="color:#AEAEB2;text-align:center">Aucun événement</td></tr>'}</tbody>
</table>
<div class="footer">Généré le ${new Date().toLocaleDateString('fr-FR')} · Labocea PMC</div>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

function FicheDeVie({ equipement, verifications, maintenances, onAddNote, onDeleteNote, initiales }: {
  equipement: Equipement
  verifications: Verification[]
  maintenances: Maintenance[]
  onAddNote: (note: FicheDeVieNote) => void
  onDeleteNote: (id: string) => void
  initiales: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formTitre, setFormTitre] = useState('')
  const [formNotes, setFormNotes] = useState('')

  function handleAddNote() {
    if (!formTitre.trim()) return
    const note: FicheDeVieNote = {
      id: crypto.randomUUID(),
      date: formDate,
      titre: formTitre.trim(),
      notes: formNotes.trim(),
      auteur: initiales,
    }
    onAddNote(note)
    setFormTitre(''); setFormNotes(''); setShowForm(false)
  }

  // Calcul ancienneté
  const anciennete = (() => {
    if (!equipement.dateAcquisition) return null
    const ms = Date.now() - new Date(equipement.dateAcquisition).getTime()
    const totalMonths = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44))
    const years  = Math.floor(totalMonths / 12)
    const months = totalMonths % 12
    if (years === 0) return `${months} mois`
    if (months === 0) return `${years} an${years > 1 ? 's' : ''}`
    return `${years} an${years > 1 ? 's' : ''} ${months} mois`
  })()

  // Construction de la timeline unifiée
  const entries: TimelineEntry[] = [
    ...(equipement.dateAcquisition
      ? [{ kind: 'acquisition' as const, date: equipement.dateAcquisition }]
      : []),
    ...verifications.map((v) => ({ kind: 'verification' as const, date: v.date, data: v })),
    ...maintenances
      .filter((m) => m.dateRealisee || m.datePrevue)
      .map((m) => ({ kind: 'maintenance' as const, date: (m.dateRealisee || m.datePrevue) as string, data: m })),
    ...(equipement.ficheDeVieNotes ?? []).map((n) => ({ kind: 'note' as const, date: n.date, data: n })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="mb-5">
      {/* Titre + actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
            Fiche de vie
          </h2>
          {anciennete && (
            <span className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--color-text-tertiary)' }}>
              <Clock size={11} />
              {anciennete}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFicheDeViePDF(equipement, entries)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}
          >
            <FileText size={12} /> Exporter PDF
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: showForm ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)', color: showForm ? 'var(--color-accent)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}
          >
            <Plus size={12} /> Ajouter une note
          </button>
        </div>
      </div>

      {/* Formulaire note manuelle */}
      {showForm && (
        <div className="rounded-xl p-4 mb-3"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-accent)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-accent)' }}>Nouvelle note</p>
          <div className="flex gap-3 mb-2">
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Titre</label>
              <input
                value={formTitre}
                onChange={(e) => setFormTitre(e.target.value)}
                placeholder="Ex : Inspection terrain, Réglage, Nettoyage…"
                className="field-input w-full"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="field-input"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Détails (optionnel)</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              placeholder="Observations, actions effectuées…"
              className="field-input w-full resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
            >
              Annuler
            </button>
            <button
              onClick={handleAddNote}
              disabled={!formTitre.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--color-accent)', color: 'white', opacity: formTitre.trim() ? 1 : 0.5 }}
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-xl px-5 py-6 text-sm text-center"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-tertiary)' }}>
          Aucun événement enregistré. Ajoutez une note ou saisissez une vérification métrologique.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          {entries.map((entry, i) => {
            const isLast = i === entries.length - 1
            const dateLabel = new Date(entry.date + 'T12:00:00').toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric'
            })

            if (entry.kind === 'acquisition') {
              return (
                <TimelineRow key="acquisition" isLast={isLast}
                  icon={<Package size={14} />}
                  iconBg="var(--color-bg-tertiary)" iconColor="var(--color-text-secondary)"
                  date={dateLabel} title="Acquisition de l'équipement" badge={null}
                />
              )
            }

            if (entry.kind === 'verification') {
              const v = entry.data
              const isOk = v.resultat === 'conforme'
              const isNok = v.resultat === 'non_conforme'
              return (
                <TimelineRow key={v.id} isLast={isLast}
                  icon={<Gauge size={14} />}
                  iconBg={isOk ? 'var(--color-success-light)' : isNok ? 'var(--color-danger-light)' : 'var(--color-warning-light)'}
                  iconColor={isOk ? 'var(--color-success)' : isNok ? 'var(--color-danger)' : 'var(--color-warning)'}
                  date={dateLabel}
                  title={VERIF_TYPE[v.type] ?? v.type}
                  subtitle={[v.technicienNom, v.remarques].filter(Boolean).join(' · ')}
                  badge={
                    isOk  ? { label: 'Conforme',     bg: 'var(--color-success-light)', color: 'var(--color-success)' } :
                    isNok ? { label: 'Non conforme',  bg: 'var(--color-danger-light)',  color: 'var(--color-danger)'  } :
                            { label: 'À reprendre',   bg: 'var(--color-warning-light)', color: 'var(--color-warning)' }
                  }
                />
              )
            }

            if (entry.kind === 'note') {
              const n = entry.data
              return (
                <TimelineRow key={n.id} isLast={isLast}
                  icon={<StickyNote size={14} />}
                  iconBg="var(--color-accent-light)" iconColor="var(--color-accent)"
                  date={dateLabel}
                  title={n.titre}
                  subtitle={[n.auteur, n.notes].filter(Boolean).join(' · ')}
                  badge={null}
                  onDelete={() => onDeleteNote(n.id)}
                />
              )
            }

            // maintenance
            const m = entry.data
            const isDone = m.statut === 'realisee'
            return (
              <TimelineRow key={m.id} isLast={isLast}
                icon={<Wrench size={14} />}
                iconBg={isDone ? 'var(--color-bg-tertiary)' : 'var(--color-warning-light)'}
                iconColor={isDone ? 'var(--color-text-secondary)' : 'var(--color-warning)'}
                date={dateLabel}
                title={MAINT_TYPE[m.type] ?? m.type}
                subtitle={[m.technicienNom, m.travauxRealises || m.description].filter(Boolean).join(' · ')}
                badge={
                  isDone
                    ? { label: 'Réalisée',  bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' }
                    : { label: 'Planifiée', bg: 'var(--color-warning-light)', color: 'var(--color-warning)'        }
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function TimelineRow({ icon, iconBg, iconColor, date, title, subtitle, badge, isLast, onDelete }: {
  icon: React.ReactNode
  iconBg: string; iconColor: string
  date: string
  title: string
  subtitle?: string
  badge: { label: string; bg: string; color: string } | null
  isLast: boolean
  onDelete?: () => void
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 group"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}>
      {/* Icône */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>
        )}
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{date}</p>
      </div>
      {/* Badge + bouton supprimer note */}
      <div className="flex items-center gap-2 shrink-0 self-start mt-0.5">
        {badge && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
            style={{ color: 'var(--color-danger)' }}
            title="Supprimer cette note"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
