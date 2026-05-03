import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, ChevronRight, Trash2, AlertTriangle, FileDown, Loader2, GripVertical, Minus, Lock, Unlock } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveClient, deleteClient } from '@/hooks/useClients'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { generateId } from '@/lib/ids'
import { isSamplingOverdue } from '@/lib/overdue'
import { exportClientPdf } from '@/lib/exportPdf'
import type { Client, Plan, SegmentType, NouvelleDemandeType } from '@/types'

const SEGMENTS: SegmentType[] = ['SRA', 'Réseau de mesure', 'RSDE']
const NOUVELLES_DEMANDES: NouvelleDemandeType[] = ['Annuelle', 'Avenant', 'Ponctuelle']

// Debounce auto-save : 800ms après la dernière modif
const DEBOUNCE = 800

export default function ClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null)
  const [sitesInput, setSitesInput] = useState('')
  const [plansLocked, setPlansLocked] = useState(true)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 180, tolerance: 5 } }),
  )
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirty = useRef(false)
  const isDeleted = useRef(false)
  // Référence vers le save en cours pour attendre sa fin avant de supprimer
  const savingPromise = useRef<Promise<void> | null>(null)

  // Écoute temps réel sur le document client
  useEffect(() => {
    if (!clientId) return
    const ref = doc(db, 'clients-v2', clientId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists() && !isDirty.current) {
        const data = { id: snap.id, ...snap.data() } as Client
        setClient(data)
        setSitesInput(data.sites.join(', '))
      }
      setLoading(false)
    })
    return () => unsub()
  }, [clientId])

  // Auto-save déclenché à chaque modif du client
  function triggerSave(updated: Client) {
    isDirty.current = true
    setClient(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid || isDeleted.current) {
        saveTimer.current = null
        return
      }
      saveTimer.current = null // le timer a tiré, on efface la ref
      setSaving(true)
      const p = (async () => {
        try {
          await saveClient(updated, uid)
        } catch {
          toast.error('Échec de la sauvegarde. Vérifie ta connexion.')
        } finally {
          setSaving(false)
          // Ne réinitialiser isDirty que s'il n'y a pas de nouveau timer en attente
          // (évite d'écraser un onSnapshot qui arriverait entre deux saves)
          if (!saveTimer.current) isDirty.current = false
        }
      })()
      savingPromise.current = p
      await p
      savingPromise.current = null
    }, DEBOUNCE)
  }

  function update(field: keyof Client, value: unknown) {
    if (!client) return
    triggerSave({ ...client, [field]: value })
  }

  function handleReorder(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !client) return
    const oldIndex = client.plans.findIndex((p) => p.id === active.id)
    const newIndex  = client.plans.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    triggerSave({ ...client, plans: arrayMove(client.plans, oldIndex, newIndex) })
  }

  // Gestion des sites (liste libre) — état local pour ne pas casser le curseur
  function handleSitesChange(raw: string) {
    setSitesInput(raw)
    if (!client) return
    isDirty.current = true
    const parsed = raw.split(',').map((s) => s.trim()).filter(Boolean)
    triggerSave({ ...client, sites: parsed })
  }

  // Nouveau plan
  function addPlan() {
    if (!client) return
    const newPlan: Plan = {
      id: generateId(),
      nom: 'Nouveau point',
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

  // Nouveau séparateur
  function addSeparator() {
    if (!client) return
    const sep: Plan = {
      id: generateId(),
      separator: true,
      nom: '',
      siteNom: '', frequence: 'Mensuel', meteo: '', nature: 'Souterraine',
      methode: 'Ponctuel', lat: '', lng: '', gpsApprox: false,
      customMonths: [], bimensuelMonths: [], defaultDay: 0, customDays: {},
      samplings: [],
    }
    triggerSave({ ...client, plans: [...client.plans, sep] })
  }

  // Mise à jour du label d'un séparateur
  function handleSeparatorLabel(planId: string, label: string) {
    if (!client) return
    const plans = client.plans.map((p) => p.id === planId ? { ...p, nom: label } : p)
    triggerSave({ ...client, plans })
  }

  // Supprimer le client
  async function handleDeleteClient() {
    if (!client) return
    // Bloquer tout save futur
    isDeleted.current = true
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    isDirty.current = false
    // Attendre la fin du save en cours avant de supprimer pour éviter le "zombie client"
    // (un setDoc qui se termine après le deleteDoc recrée le document)
    if (savingPromise.current) {
      try { await savingPromise.current } catch { /* ignore */ }
    }
    try {
      await deleteClient(client.id)
      navigate('/missions')
    } catch {
      isDeleted.current = false
      toast.error('Échec de la suppression. Réessaie.')
    }
  }

  // Supprimer un plan — déclenche la confirmation inline (pas de confirm() natif)
  function requestDeletePlan(planId: string) {
    setConfirmDeletePlanId(planId)
  }

  function confirmDeletePlan() {
    if (!client || !confirmDeletePlanId) return
    triggerSave({ ...client, plans: client.plans.filter((p) => p.id !== confirmDeletePlanId) })
    setConfirmDeletePlanId(null)
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
    <div className="p-4 sm:p-6 max-w-2xl pb-10">
      {/* Nav retour */}
      <button onClick={() => navigate('/missions')}
        className="flex items-center gap-1 text-sm mb-6"
        style={{ color: 'var(--color-accent)' }}>
        <ChevronLeft size={16} /> Missions
      </button>

      {/* Titre + statut save + suppression */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {client.nom || 'Client sans nom'}
        </h1>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sauvegarde…</span>}

          {/* Export PDF */}
          <button
            onClick={async () => {
              setExporting(true)
              try { exportClientPdf(client) }
              catch { toast.error('Erreur lors de la génération du PDF.') }
              finally { setExporting(false) }
            }}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ color: 'var(--color-accent)', background: 'var(--color-accent-light)' }}>
            {exporting
              ? <Loader2 size={13} className="animate-spin" />
              : <FileDown size={13} />}
            PDF
          </button>

          {/* Export Excel (chargement différé pour ne pas alourdir le bundle initial) */}
          <button
            onClick={async () => {
              try {
                const { exportClientExcel } = await import('@/lib/exportExcel')
                exportClientExcel(client)
              } catch (err) {
                console.error('[Excel export]', err)
                toast.error('Erreur Excel : ' + (err instanceof Error ? err.message : String(err)))
              }
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ color: '#217346', background: '#E8F5EC' }}>
            <FileDown size={13} />
            Excel
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)' }}>
              <Trash2 size={13} /> Supprimer
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
              <AlertTriangle size={13} style={{ color: 'var(--color-danger)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
                Supprimer définitivement ?
              </span>
              <button onClick={handleDeleteClient}
                className="text-xs font-semibold px-2 py-0.5 rounded"
                style={{ background: 'var(--color-danger)', color: 'white' }}>
                Oui
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bloc infos administratives */}
      <Section title="Informations générales">
        <Field label="Nom du client">
          <input value={client.nom} onChange={(e) => update('nom', e.target.value)}
            className="field-input" placeholder="Nom du client"
            style={!client.nom.trim() ? { borderColor: 'var(--color-danger)' } : undefined} />
          {!client.nom.trim() && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>Le nom est obligatoire.</p>
          )}
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
          <input value={sitesInput} onChange={(e) => handleSitesChange(e.target.value)}
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

      {/* Points de prélèvement */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Points de prélèvement
          </h2>
          <div className="flex items-center gap-2">
            {/* Bouton verrouillage — masque les contrôles de réorganisation */}
            <button
              onClick={() => setPlansLocked(l => !l)}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
              style={{
                background: plansLocked ? 'var(--color-bg-tertiary)' : 'var(--color-accent-light)',
                color: plansLocked ? 'var(--color-text-tertiary)' : 'var(--color-accent)',
                border: `1px solid ${plansLocked ? 'var(--color-border)' : 'var(--color-accent)'}`,
              }}
              title={plansLocked ? 'Déverrouiller pour réorganiser' : 'Verrouiller la réorganisation'}>
              {plansLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            {!plansLocked && (
              <>
                <button onClick={addSeparator}
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  title="Ajouter un séparateur de section">
                  <Minus size={14} /> Séparateur
                </button>
                <button onClick={addPlan}
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                  <Plus size={14} /> Ajouter
                </button>
              </>
            )}
          </div>
        </div>

        {client.plans.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Aucun point — clique sur "Ajouter" pour créer le premier.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
            <SortableContext items={client.plans.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="rounded-xl overflow-hidden"
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                {buildDisplayItems(client.plans).map((item, displayIdx) => {
                  if (item.kind === 'header') {
                    return (
                      <div key={item.key}
                        className="px-4 py-1.5"
                        style={{
                          background: 'var(--color-bg-tertiary)',
                          borderTop: displayIdx === 0 ? 'none' : '1px solid var(--color-border-subtle)',
                          borderBottom: '1px solid var(--color-border-subtle)',
                        }}>
                        <span className="text-xs font-semibold uppercase"
                          style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>
                          {item.site}
                        </span>
                      </div>
                    )
                  }
                  const { plan, origIdx } = item
                  const isLast = origIdx === client.plans.length - 1
                  return plan.separator
                    ? <SortableSeparatorRow
                        key={plan.id}
                        plan={plan}
                        isLast={isLast}
                        locked={plansLocked}
                        onDelete={() => requestDeletePlan(plan.id)}
                        onConfirmDelete={confirmDeletePlan}
                        onCancelDelete={() => setConfirmDeletePlanId(null)}
                        isConfirmingDelete={confirmDeletePlanId === plan.id}
                        onLabelChange={(label) => handleSeparatorLabel(plan.id, label)}
                      />
                    : <SortablePlanRow
                        key={plan.id}
                        plan={plan}
                        clientYear={Number(client.annee) || undefined}
                        clientId={client.id}
                        isLast={isLast}
                        locked={plansLocked}
                        isConfirmingDelete={confirmDeletePlanId === plan.id}
                        onOpen={() => navigate(`/missions/${client.id}/plan/${plan.id}`)}
                        onDelete={() => requestDeletePlan(plan.id)}
                        onConfirmDelete={confirmDeletePlan}
                        onCancelDelete={() => setConfirmDeletePlanId(null)}
                      />
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

// ── Helper : liste d'affichage avec headers de site ─────────

type DisplayHeader = { kind: 'header'; site: string; key: string }
type DisplayPlan   = { kind: 'plan';   plan: Plan; origIdx: number }
type DisplayItem   = DisplayHeader | DisplayPlan

function buildDisplayItems(plans: Plan[]): DisplayItem[] {
  const result: DisplayItem[] = []
  let lastSite = ''
  let headerCount = 0
  plans.forEach((plan, origIdx) => {
    // Les séparateurs manuels n'influencent pas les headers de site automatiques
    if (!plan.separator && plan.siteNom && plan.siteNom !== lastSite) {
      result.push({ kind: 'header', site: plan.siteNom, key: `hdr-${plan.siteNom}-${headerCount++}` })
      lastSite = plan.siteNom
    }
    result.push({ kind: 'plan', plan, origIdx })
  })
  return result
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

// ── Séparateur sortable ───────────────────────────────────────

interface SortableSeparatorRowProps {
  plan: Plan
  isLast: boolean
  isConfirmingDelete: boolean
  locked?: boolean
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onLabelChange: (label: string) => void
}

function SortableSeparatorRow({
  plan, isLast, isConfirmingDelete, locked,
  onDelete, onConfirmDelete, onCancelDelete, onLabelChange,
}: SortableSeparatorRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: plan.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Poignée drag */}
        <button
          {...(!locked ? { ...attributes, ...listeners } : {})}
          className="shrink-0 p-1 rounded touch-none"
          style={{ color: 'var(--color-text-tertiary)', cursor: locked ? 'default' : isDragging ? 'grabbing' : 'grab', opacity: locked ? 0.3 : 1 }}
          tabIndex={-1}
        >
          <GripVertical size={15} strokeWidth={1.8} />
        </button>

        {/* Ligne + label éditable */}
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          <input
            value={plan.nom}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Section…"
            className="bg-transparent border-none outline-none text-center"
            style={{
              color: 'var(--color-text-tertiary)',
              fontSize: '11px',
              fontWeight: 500,
              minWidth: '40px',
              width: `${Math.max(60, (plan.nom.length || 4) * 7 + 24)}px`,
              letterSpacing: '0.03em',
            }}
          />
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Supprimer */}
        <button onClick={onDelete} className="shrink-0 p-1 rounded"
          style={{ color: isConfirmingDelete ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
          onMouseLeave={(e) => { if (!isConfirmingDelete) e.currentTarget.style.color = 'var(--color-text-tertiary)' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Confirmation suppression inline */}
      {isConfirmingDelete && (
        <div className="flex items-center gap-2 mx-3 mb-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
          <AlertTriangle size={13} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <span className="text-xs font-medium flex-1" style={{ color: 'var(--color-danger)' }}>
            Supprimer ce séparateur ?
          </span>
          <button onClick={onConfirmDelete}
            className="text-xs font-semibold px-2.5 py-1 rounded"
            style={{ background: 'var(--color-danger)', color: 'white' }}>
            Supprimer
          </button>
          <button onClick={onCancelDelete}
            className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}

// ── Ligne de plan sortable ────────────────────────────────────

interface SortablePlanRowProps {
  plan: Plan
  clientYear: number | undefined
  clientId: string
  isLast: boolean
  isConfirmingDelete: boolean
  locked?: boolean
  onOpen: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

function SortablePlanRow({
  plan, clientYear, isLast, isConfirmingDelete, locked,
  onOpen, onDelete, onConfirmDelete, onCancelDelete,
}: SortablePlanRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: plan.id })

  const overdueCount = (plan.samplings ?? []).filter((s) => isSamplingOverdue(s, clientYear)).length

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
        background: isDragging ? 'var(--color-accent-light)' : 'transparent',
      }}
      className="flex flex-col px-3 py-3 gap-2"
    >
      <div className="flex items-center gap-2">
        {/* Poignée drag */}
        <button
          {...(!locked ? { ...attributes, ...listeners } : {})}
          className="shrink-0 p-1 rounded touch-none"
          style={{ color: 'var(--color-text-tertiary)', cursor: locked ? 'default' : isDragging ? 'grabbing' : 'grab', opacity: locked ? 0.3 : 1 }}
          title={locked ? 'Réorganisation verrouillée' : 'Glisser pour réorganiser'}
          tabIndex={-1}
        >
          <GripVertical size={15} strokeWidth={1.8} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
              {plan.nom || 'Point sans nom'}
            </p>
            {overdueCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 flex items-center gap-1"
                style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                <AlertTriangle size={10} />
                {overdueCount} en retard
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {[plan.siteNom, plan.frequence, plan.nature].filter(Boolean).join(' · ')}
          </p>
        </div>

        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
          {(plan.samplings ?? []).length} prélèv.
        </span>
        <button onClick={onOpen}
          className="shrink-0 flex items-center gap-1 text-sm font-medium"
          style={{ color: 'var(--color-accent)' }}>
          Ouvrir <ChevronRight size={14} />
        </button>
        <button onClick={onDelete} className="shrink-0 p-1 rounded"
          style={{ color: isConfirmingDelete ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
          onMouseLeave={(e) => { if (!isConfirmingDelete) e.currentTarget.style.color = 'var(--color-text-tertiary)' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Confirmation suppression inline */}
      {isConfirmingDelete && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
          <AlertTriangle size={13} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <span className="text-xs font-medium flex-1" style={{ color: 'var(--color-danger)' }}>
            Supprimer ce point et tous ses prélèvements ?
          </span>
          <button onClick={onConfirmDelete}
            className="text-xs font-semibold px-2.5 py-1 rounded"
            style={{ background: 'var(--color-danger)', color: 'white' }}>
            Supprimer
          </button>
          <button onClick={onCancelDelete}
            className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Annuler
          </button>
        </div>
      )}
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
