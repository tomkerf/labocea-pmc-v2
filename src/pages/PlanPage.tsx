import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, FileText, X } from 'lucide-react'
import { toast } from '@/stores/toastStore'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveClient } from '@/hooks/useClients'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { useUsersListener } from '@/hooks/useUsers'
import { useUsersStore } from '@/stores/usersStore'
import { generateId } from '@/lib/ids'
import { generateSamplings } from '@/lib/samplings'
import { SamplingForm } from '@/components/plan/SamplingForm'
import { PlanConfigSection } from '@/components/plan/PlanConfigSection'
import { buildReportHtml } from '@/lib/reportHtml'
import type { Client, Plan, Sampling, SamplingStatus, SamplingHistoryEntry } from '@/types'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const STATUS_CONFIG: Record<SamplingStatus, { label: string; bg: string; color: string }> = {
  planned:       { label: 'Planifié',    bg: 'var(--color-bg-tertiary)',    color: 'var(--color-text-secondary)' },
  done:          { label: 'Réalisé',     bg: 'var(--color-success-light)',  color: 'var(--color-success)' },
  overdue:       { label: 'En retard',   bg: 'var(--color-danger-light)',   color: 'var(--color-danger)' },
  non_effectue:  { label: 'Non effectué',bg: 'var(--color-warning-light)',  color: 'var(--color-warning)' },
}

const DEBOUNCE = 800

// ── Champs audités et leur formateur ──────────────────────────
// Seuls les champs discrets/binaires sont audités — pas les textes libres (motif, comment)
// qui génèreraient une entrée par frappe clavier
const AUDIT_FIELDS: Partial<Record<keyof Sampling, (v: unknown) => string>> = {
  status:       (v) => STATUS_CONFIG[v as SamplingStatus]?.label ?? String(v),
  doneDate:     (v) => v ? new Date(v as string).toLocaleDateString('fr-FR') : '—',
  plannedMonth: (v) => MOIS[v as number] ?? String(v),
  plannedDay:   (v) => v ? `Jour ${v}` : '—',
  plannedTime:  (v) => (v as string) || '—',
  rapportPrevu: (v) => v ? 'Oui' : 'Non',
  rapportDate:  (v) => v ? new Date(v as string).toLocaleDateString('fr-FR') : '—',
  nappe:        (v) => ({ haute: 'Haute', basse: 'Basse', '': '—' }[v as string] ?? String(v)),
  doneBy:       () => '—',  // sera résolu depuis users lors du PDF
}



export default function PlanPage() {
  const { clientId, planId } = useParams<{ clientId: string; planId: string }>()
  const navigate = useNavigate()
  const uid = useAuthStore(selectUid)
  useUsersListener()
  const users = useUsersStore((s) => s.users)
  // Nom dénormalisé pour le journal d'audit
  const currentUser = users.find((u) => u.uid === uid)
  const currentUserNom = currentUser
    ? `${currentUser.prenom} ${currentUser.nom}`
    : (uid ?? '—')

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSampling, setSelectedSampling] = useState<string | null>(null)
  const [pdfPreview,      setPdfPreview]      = useState<string | null>(null)
  const [addingDate, setAddingDate] = useState(false)
  const [newDate, setNewDate] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirty = useRef(false)

  useEffect(() => {
    if (!clientId) return
    const ref = doc(db, 'clients-v2', clientId)
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        // Client supprimé depuis un autre onglet/appareil → rediriger sans laisser l'utilisateur sur un plan fantôme
        navigate('/missions', { replace: true })
        return
      }
      if (!isDirty.current) setClient({ id: snap.id, ...snap.data() } as Client)
      setLoading(false)
    })
    return () => unsub()
  }, [clientId, navigate])

  const plan = client?.plans.find((p) => p.id === planId) ?? null

  function triggerSave(updated: Client) {
    isDirty.current = true
    setClient(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!uid) {
        saveTimer.current = null
        return
      }
      saveTimer.current = null // le timer a tiré, on efface la ref
      setSaving(true)
      try { await saveClient(updated, uid) }
      catch { toast.error('Échec de la sauvegarde. Vérifie ta connexion.') }
      finally {
        setSaving(false)
        // Ne réinitialiser isDirty que s'il n'y a pas de nouveau timer en attente
        if (!saveTimer.current) isDirty.current = false
      }
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
    const updatedSamplings = plan.samplings.map((s) => {
      if (s.id !== samplingId) return s

      const patch: Partial<Sampling> = { [field]: value }

      // Quand on passe en "Réalisé" et que doneBy n'est pas encore défini → technicien connecté par défaut
      if (field === 'status' && value === 'done' && !s.doneBy) patch.doneBy = uid_
      // Quand on quitte "Réalisé" → effacer doneBy
      if (field === 'status' && value !== 'done') patch.doneBy = ''

      // ── Journal d'audit ──────────────────────────────────────
      // Tracer uniquement les champs significatifs quand la valeur change vraiment
      const formatter = AUDIT_FIELDS[field]
      if (formatter && String(s[field]) !== String(value)) {
        const entry: SamplingHistoryEntry = {
          at: new Date().toISOString(),
          by: uid_,
          byNom: currentUserNom,
          field: String(field),
          from: formatter(s[field]),
          to: formatter(value),
        }
        // Cas spécial doneBy : résoudre le nom depuis users
        if (field === 'doneBy') {
          const fromUser = users.find((u) => u.uid === String(s[field]))
          const toUser   = users.find((u) => u.uid === String(value))
          entry.from = fromUser ? `${fromUser.prenom} ${fromUser.nom}` : (s[field] ? String(s[field]) : '—')
          entry.to   = toUser   ? `${toUser.prenom} ${toUser.nom}`     : (value  ? String(value)   : '—')
        }
        patch.history = [...(s.history ?? []), entry]
      }

      return { ...s, ...patch }
    })
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? { ...p, samplings: updatedSamplings } : p) })
  }

  function generateSamplingsForPlan() {
    if (!client || !plan) return
    if (!confirm(`Générer les prélèvements pour fréquence "${plan.frequence}" ? Les prélèvements existants seront remplacés.`)) return
    const newSamplings = generateSamplings(plan)
    const updatedPlan = { ...plan, samplings: newSamplings }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updatedPlan : p) })
  }

  /** Ajoute un prélèvement à date libre (mode Personnalisé) */
  function addCustomSampling(dateStr: string) {
    if (!client || !plan || !dateStr) return
    const d = new Date(dateStr + 'T12:00:00')
    // Bloquer les doublons à la même date
    const isDuplicate = plan.samplings.some(
      (s) => s.plannedMonth === d.getMonth() && s.plannedDay === d.getDate()
    )
    if (isDuplicate) {
      alert(`Un prélèvement est déjà prévu le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.`)
      return
    }
    const newSampling: Sampling = {
      id: generateId(),
      num: plan.samplings.length + 1,
      plannedMonth: d.getMonth(),
      plannedDay: d.getDate(),
      status: 'planned',
      doneDate: '', comment: '',
      nappe: '' as NappeType,
      rapportPrevu: false, rapportDate: '',
      tente: false, reportHistory: [], doneBy: '',
    }
    const updated = { ...plan, samplings: [...plan.samplings, newSampling].sort((a, b) => a.plannedMonth - b.plannedMonth || a.plannedDay - b.plannedDay) }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updated : p) })
    setNewDate('')
    setAddingDate(false)
  }

  /** Supprime un prélèvement (mode Personnalisé) */
  function deleteSampling(samplingId: string) {
    if (!client || !plan) return
    if (!confirm('Supprimer ce prélèvement ?')) return
    const updated = { ...plan, samplings: plan.samplings.filter((s) => s.id !== samplingId).map((s, i) => ({ ...s, num: i + 1 })) }
    triggerSave({ ...client, plans: client.plans.map((p) => p.id === planId ? updated : p) })
    if (selectedSampling === samplingId) setSelectedSampling(null)
  }

  function openPdfPreview() {
    if (!client || !plan) return
    setPdfPreview(buildReportHtml(client, plan, users, false))
  }

  function exportAnnualReport() {
    if (!client || !plan) return
    const blob = new Blob([buildReportHtml(client, plan, users, true)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} /></div>
  if (!client || !plan) return <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Point introuvable.</div>

  return (
    <div className="p-4 sm:p-6 max-w-2xl pb-10">
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

      <PlanConfigSection plan={plan} onUpdate={updatePlan} />

      {/* Calendrier des prélèvements */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Prélèvements {new Date().getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            {plan.samplings.length > 0 && (
              <button
                onClick={openPdfPreview}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                <FileText size={14} />
                <span className="hidden sm:inline">Aperçu PDF</span>
              </button>
            )}
            {plan.frequence === 'Personnalisé' ? (
              <button
                onClick={() => setAddingDate(v => !v)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                <Plus size={14} /> Ajouter une date
              </button>
            ) : (
              <button onClick={generateSamplingsForPlan}
                className="text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                Générer
              </button>
            )}
          </div>
        </div>

        {/* Sélecteur de date pour mode Personnalisé */}
        {plan.frequence === 'Personnalisé' && addingDate && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl"
            style={{ background: 'var(--color-accent-light)', border: '1px solid var(--color-accent)20' }}>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              autoFocus
              className="flex-1 px-3 py-1.5 rounded-lg text-sm"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <button
              onClick={() => addCustomSampling(newDate)}
              disabled={!newDate}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: newDate ? 'var(--color-accent)' : 'var(--color-bg-tertiary)', color: newDate ? 'white' : 'var(--color-text-tertiary)' }}
            >
              Confirmer
            </button>
            <button
              onClick={() => { setAddingDate(false); setNewDate('') }}
              className="px-2 py-1.5 rounded-lg text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Annuler
            </button>
          </div>
        )}

        {plan.samplings.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {plan.frequence === 'Personnalisé'
              ? 'Aucun prélèvement — clique sur "Ajouter une date" pour créer les interventions une par une.'
              : 'Aucun prélèvement — clique sur "Générer" pour créer le calendrier automatiquement.'}
          </p>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {(plan.samplings ?? []).map((s, i) => {
              const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG['planned']
              const isSelected = selectedSampling === s.id
              const isCustom = plan.frequence === 'Personnalisé'
              // Libellé de la date : pour Personnalisé, affiche "15 Mars" au lieu de "Mars — j15"
              const dateLabel = isCustom && s.plannedDay
                ? `${s.plannedDay} ${MOIS[s.plannedMonth]}`
                : `${MOIS[s.plannedMonth]}${s.plannedDay ? ` — j${s.plannedDay}` : ''}`
              return (
                <div key={s.id}>
                  <div className="flex items-center"
                    style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <button
                      onClick={() => setSelectedSampling(isSelected ? null : s.id)}
                      className="flex-1 flex items-center gap-4 px-5 py-3 text-left transition-colors"
                      style={{ background: isSelected ? 'var(--color-accent-light)' : 'transparent' }}
                    >
                      <span className="text-sm font-medium w-6 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                        {s.num}
                      </span>
                      <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {dateLabel}
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
                    {/* Bouton supprimer — visible uniquement en mode Personnalisé */}
                    {isCustom && (
                      <button
                        onClick={() => deleteSampling(s.id)}
                        className="px-3 py-3 shrink-0"
                        style={{ color: 'var(--color-text-tertiary)' }}
                        title="Supprimer ce prélèvement"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Formulaire inline du prélèvement */}
                  {isSelected && (
                    <div className="px-5 py-4" style={{ background: 'var(--color-bg-tertiary)', borderBottom: i < plan.samplings.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                      <SamplingForm
                        sampling={s}
                        onUpdate={(field, val) => updateSampling(s.id, field, val)}
                        users={users}
                        clientId={clientId!}
                        planId={planId!}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modale de prévisualisation PDF ───────────────────── */}
      {pdfPreview && (
        <div
          className="fixed inset-0 z-[80] flex flex-col"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setPdfPreview(null)}
        >
          <div
            className="flex flex-col m-4 md:m-8 rounded-2xl overflow-hidden flex-1"
            style={{ background: 'var(--color-bg-secondary)', boxShadow: 'var(--shadow-modal)', maxHeight: 'calc(100dvh - 32px)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Aperçu du rapport PDF
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportAnnualReport}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  <FileText size={14} />
                  Imprimer / Télécharger
                </button>
                <button
                  onClick={() => setPdfPreview(null)}
                  className="p-1.5 rounded-lg"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            {/* Iframe preview */}
            <iframe
              srcDoc={pdfPreview}
              className="flex-1 w-full"
              style={{ border: 'none', background: 'white' }}
              title="Aperçu PDF"
            />
          </div>
        </div>
      )}
    </div>
  )
}

