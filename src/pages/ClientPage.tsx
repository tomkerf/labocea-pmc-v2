import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, ChevronRight, Trash2 } from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveClient } from '@/hooks/useClients'
import { useAuthStore } from '@/stores/authStore'
import { generateId } from '@/lib/ids'
import type { Client, Plan, SegmentType, NouvelleDemandeType } from '@/types'

const SEGMENTS: SegmentType[] = [
  'Réseaux de mesure', 'AEP', 'Eaux usées',
  'Eaux superficielles', 'Eaux souterraines', 'Autre',
]
const NOUVELLES_DEMANDES: NouvelleDemandeType[] = ['Annuelle', 'Avenant', 'Ponctuelle']

// Debounce auto-save : 800ms après la dernière modif
const DEBOUNCE = 800

export default function ClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const uid = useAuthStore((s) => s.uid())

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Écoute temps réel sur le document client
  useEffect(() => {
    if (!clientId) return
    const ref = doc(db, 'clients-v2', clientId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setClient({ id: snap.id, ...snap.data() } as Client)
      setLoading(false)
    })
    return () => unsub()
  }, [clientId])

  // Auto-save déclenché à chaque modif du client
  function triggerSave(updated: Client) {
    setClient(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) return
      setSaving(true)
      try { await saveClient(updated, uid) }
      finally { setSaving(false) }
    }, DEBOUNCE)
  }

  function update(field: keyof Client, value: unknown) {
    if (!client) return
    triggerSave({ ...client, [field]: value })
  }

  // Gestion des sites (liste libre)
  function updateSites(raw: string) {
    update('sites', raw.split(',').map((s) => s.trim()).filter(Boolean))
  }

  // Nouveau plan
  function addPlan() {
    if (!client) return
    const newPlan: Plan = {
      id: generateId(),
      nom: 'Nouveau plan',
      siteNom: '',
      frequence: 'Mensuel',
      meteo: '',
      nature: 'Souterraine',
      methode: 'Ponctuel',
      lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [],
      defaultDay: 0, customDays: {},
      samplings: [],
    }
    triggerSave({ ...client, plans: [...client.plans, newPlan] })
  }

  // Supprimer un plan
  function deletePlan(planId: string) {
    if (!client || !confirm('Supprimer ce plan et tous ses prélèvements ?')) return
    triggerSave({ ...client, plans: client.plans.filter((p) => p.id !== planId) })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    )
  }
  if (!client) return <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Client introuvable.</div>

  return (
    <div className="p-6 max-w-2xl">
      {/* Nav retour */}
      <button onClick={() => navigate('/missions')}
        className="flex items-center gap-1 text-sm mb-6"
        style={{ color: 'var(--color-accent)' }}>
        <ChevronLeft size={16} /> Missions
      </button>

      {/* Titre + statut save */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {client.nom || 'Client sans nom'}
        </h1>
        {saving && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}
      </div>

      {/* Bloc infos administratives */}
      <Section title="Informations générales">
        <Field label="Nom du client">
          <input value={client.nom} onChange={(e) => update('nom', e.target.value)}
            className="field-input" placeholder="Nom du client" />
        </Field>
        <Field label="Segment">
          <select value={client.segment} onChange={(e) => update('segment', e.target.value as SegmentType)}
            className="field-input">
            {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Type de demande">
          <select value={client.nouvelleDemande} onChange={(e) => update('nouvelleDemande', e.target.value as NouvelleDemandeType)}
            className="field-input">
            {NOUVELLES_DEMANDES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Préleveur (initiales)">
          <input value={client.preleveur} onChange={(e) => update('preleveur', e.target.value)}
            className="field-input" placeholder="ex: THK" />
        </Field>
        <Field label="Année">
          <input value={client.annee} onChange={(e) => update('annee', e.target.value)}
            className="field-input" placeholder="2026" />
        </Field>
        <Field label="Sites (séparés par virgule)" last>
          <input value={client.sites.join(', ')} onChange={(e) => updateSites(e.target.value)}
            className="field-input" placeholder="Quimper, Kerambris, Aven" />
        </Field>
      </Section>

      {/* Interlocuteur */}
      <Section title="Contact">
        <Field label="Interlocuteur">
          <input value={client.interlocuteur} onChange={(e) => update('interlocuteur', e.target.value)}
            className="field-input" placeholder="Prénom Nom" />
        </Field>
        <Field label="Fonction">
          <input value={client.fonction} onChange={(e) => update('fonction', e.target.value)}
            className="field-input" placeholder="Directeur technique" />
        </Field>
        <Field label="Téléphone">
          <input value={client.telephone} onChange={(e) => update('telephone', e.target.value)}
            className="field-input" placeholder="02 98 …" />
        </Field>
        <Field label="Mobile">
          <input value={client.mobile} onChange={(e) => update('mobile', e.target.value)}
            className="field-input" placeholder="06 …" />
        </Field>
        <Field label="Email" last>
          <input type="email" value={client.email} onChange={(e) => update('email', e.target.value)}
            className="field-input" placeholder="contact@…" />
        </Field>
      </Section>

      {/* Contrat */}
      <Section title="Contrat">
        <Field label="N° Devis">
          <input value={client.numDevis} onChange={(e) => update('numDevis', e.target.value)}
            className="field-input" />
        </Field>
        <Field label="N° Convention">
          <input value={client.numConvention} onChange={(e) => update('numConvention', e.target.value)}
            className="field-input" />
        </Field>
        <Field label="Durée contrat">
          <input value={client.dureeContrat} onChange={(e) => update('dureeContrat', e.target.value)}
            className="field-input" placeholder="12 mois" />
        </Field>
        <Field label="Montant total (€)">
          <input type="number" value={client.montantTotal || ''} onChange={(e) => update('montantTotal', Number(e.target.value))}
            className="field-input" />
        </Field>
        <Field label="Part PMC (€)">
          <input type="number" value={client.partPMC || ''} onChange={(e) => update('partPMC', Number(e.target.value))}
            className="field-input" />
        </Field>
        <Field label="Part sous-traitance (€)" last>
          <input type="number" value={client.partSousTraitance || ''} onChange={(e) => update('partSousTraitance', Number(e.target.value))}
            className="field-input" />
        </Field>
      </Section>

      {/* Mission */}
      <Section title="Description de la mission">
        <Field label="Mission" last>
          <textarea value={client.mission} onChange={(e) => update('mission', e.target.value)}
            rows={3} className="field-input resize-none" placeholder="Description libre de la mission…" />
        </Field>
      </Section>

      {/* Plans de prélèvement */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Plans de prélèvement
          </h2>
          <button onClick={addPlan}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {client.plans.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Aucun plan — clique sur "Ajouter" pour créer le premier.
          </p>
        ) : (
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {client.plans.map((plan, i) => (
              <div key={plan.id}
                style={{ borderBottom: i < client.plans.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
                className="flex items-center px-5 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {plan.nom || 'Plan sans nom'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {[plan.siteNom, plan.frequence, plan.nature].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                  {plan.samplings.length} prélèv.
                </span>
                <button onClick={() => navigate(`/missions/${client.id}/plan/${plan.id}`)}
                  className="shrink-0 flex items-center gap-1 text-sm font-medium"
                  style={{ color: 'var(--color-accent)' }}>
                  Ouvrir <ChevronRight size={14} />
                </button>
                <button onClick={() => deletePlan(plan.id)} className="shrink-0 p-1 rounded"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Composants utilitaires ──────────────────────────────────

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
    <div className="flex items-start gap-4 px-5 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <label className="text-sm shrink-0 pt-0.5" style={{ color: 'var(--color-text-secondary)', minWidth: '160px' }}>
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  )
}
