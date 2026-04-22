import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, FileText } from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveClient } from '@/hooks/useClients'
import { useAuthStore, selectUid } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { useUsersListener } from '@/hooks/useUsers'
import { useUsersStore } from '@/stores/usersStore'
import { generateId } from '@/lib/ids'
import { generateSamplings } from '@/lib/samplings'
import type { AppUser, Client, Plan, Sampling, SamplingStatus, FrequenceType, NatureEauType, MethodeType, NappeType, ChecklistItem, SamplingHistoryEntry } from '@/types'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const FREQUENCES: FrequenceType[] = ['Mensuel', 'Bimensuel', 'Trimestriel', 'Semestriel', 'Annuel', 'Personnalisé']
const NATURES: NatureEauType[] = ['Eau usée', 'Rivière', 'Souterraine', 'Eau pluviale', 'Eau saline', 'Boues', 'Autre']
const METHODES: MethodeType[] = ['Ponctuel', 'Composite', 'Automatique']

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

  /** Export PDF annuel du plan : synthèse de tous les prélèvements de l'année */
  function exportAnnualReport() {
    if (!client || !plan) return
    const year = new Date().getFullYear()
    const title = `Suivi des prélèvements ${year} — ${plan.nom} — ${client.nom}`

    const statusLabels: Record<string, string> = {
      planned: 'Planifié', done: 'Réalisé',
      overdue: 'En retard', non_effectue: 'Non effectué',
    }

    const rows = plan.samplings.map((s) => {
      const techUser = users.find((u) => u.uid === s.doneBy)
      const techLabel = techUser ? `${techUser.prenom} ${techUser.nom}` : (s.doneBy ? s.doneBy : '—')
      const dateLabel = s.doneDate
        ? new Date(s.doneDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—'
      const statusLabel = statusLabels[s.status] ?? s.status
      const motifLabel = s.motif?.trim() || '—'

      // couleur statut
      const statusColor: Record<string, string> = {
        done: '#34c759', overdue: '#ff3b30', non_effectue: '#ff9f0a', planned: '#8e8e93',
      }
      const color = statusColor[s.status] ?? '#8e8e93'

      return `<tr>
        <td style="color:#6e6e73;text-align:center">${s.num}</td>
        <td>${MOIS[s.plannedMonth]}${s.plannedDay ? ` (j.${s.plannedDay})` : ''}</td>
        <td>${dateLabel}</td>
        <td><span style="color:${color};font-weight:500">${statusLabel}</span></td>
        <td>${techLabel}</td>
        <td style="color:#6e6e73">${motifLabel}</td>
      </tr>`
    }).join('')

    const now = new Date()
    const exportDate = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    const exportTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    const done  = plan.samplings.filter((s) => s.status === 'done').length
    const nonEf = plan.samplings.filter((s) => s.status === 'non_effectue').length
    const late  = plan.samplings.filter((s) => s.status === 'overdue').length

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, Helvetica Neue, sans-serif; font-size: 13px; color: #1d1d1f; margin: 40px; }
        h1 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
        .meta { color: #6e6e73; font-size: 12px; margin-bottom: 8px; }
        .stats { display: flex; gap: 24px; margin-bottom: 28px; padding: 12px 0; border-top: 1px solid #e5e5ea; border-bottom: 1px solid #e5e5ea; }
        .stat { text-align: center; }
        .stat strong { display: block; font-size: 20px; font-weight: 700; }
        .stat span { font-size: 11px; color: #6e6e73; text-transform: uppercase; letter-spacing: .04em; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
             color: #6e6e73; border-bottom: 2px solid #d2d2d7; padding: 8px 12px; }
        td { padding: 9px 12px; border-bottom: 1px solid #e5e5ea; vertical-align: top; }
        .footer { margin-top: 32px; font-size: 11px; color: #aeaeb2; }
        @media print { body { margin: 20px; } }
      </style></head><body>
      <h1>${title}</h1>
      <p class="meta">
        Client : ${client.nom} &nbsp;·&nbsp; Point : ${plan.nom}
        ${plan.siteNom ? ` &nbsp;·&nbsp; Site : ${plan.siteNom}` : ''}
        &nbsp;·&nbsp; Fréquence : ${plan.frequence} &nbsp;·&nbsp; Méthode : ${plan.methode}
      </p>
      <p class="meta">Exporté le ${exportDate} à ${exportTime} — Labocea PMC</p>
      <div class="stats">
        <div class="stat"><strong style="color:#34c759">${done}</strong><span>Réalisés</span></div>
        <div class="stat"><strong style="color:#ff9f0a">${nonEf}</strong><span>Non effectués</span></div>
        <div class="stat"><strong style="color:#ff3b30">${late}</strong><span>En retard</span></div>
        <div class="stat"><strong>${plan.samplings.length}</strong><span>Total</span></div>
      </div>
      <table>
        <thead><tr>
          <th style="width:32px;text-align:center">N°</th>
          <th>Mois prévu</th>
          <th>Date réalisée</th>
          <th>Statut</th>
          <th>Technicien</th>
          <th>Motif</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="footer">Document généré automatiquement par Labocea PMC V2</p>
      <script>window.onload = () => { window.print() }<\/script>
      </body></html>`

    // Blob + URL.createObjectURL — compatible tous navigateurs et mobile Safari
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener'
    a.click()
    // Libérer la mémoire après ouverture
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} /></div>
  if (!client || !plan) return <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>Point introuvable.</div>

  return (
    <div className="p-6 max-w-2xl">
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

      {/* Config du plan */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          Configuration
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <PlanField label="Nom du point">
            <input value={plan.nom} onChange={(e) => updatePlan('nom', e.target.value)} className="field-input"
              style={!plan.nom.trim() ? { borderColor: 'var(--color-danger)' } : undefined} />
            {!plan.nom.trim() && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>Le nom du point est obligatoire.</p>
            )}
          </PlanField>
          <PlanField label="Site">
            <input value={plan.siteNom} onChange={(e) => updatePlan('siteNom', e.target.value)} className="field-input" placeholder="Nom du site" />
          </PlanField>
          <PlanField label="Fréquence">
            <select value={plan.frequence} onChange={(e) => updatePlan('frequence', e.target.value as FrequenceType)} className="field-input">
              {FREQUENCES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </PlanField>
          <PlanField label="Nature de l'eau">
            <select value={plan.nature} onChange={(e) => updatePlan('nature', e.target.value as NatureEauType)} className="field-input">
              {NATURES.map((n) => <option key={n}>{n}</option>)}
            </select>
          </PlanField>
          <PlanField label="Méthode">
            <select value={plan.methode} onChange={(e) => updatePlan('methode', e.target.value as MethodeType)} className="field-input">
              {METHODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </PlanField>
          <PlanField label="Latitude">
            <input
              value={plan.lat}
              onChange={(e) => updatePlan('lat', e.target.value)}
              className="field-input"
              placeholder="ex : 48.1234"
              inputMode="decimal"
            />
          </PlanField>
          <PlanField label="Longitude">
            <input
              value={plan.lng}
              onChange={(e) => updatePlan('lng', e.target.value)}
              className="field-input"
              placeholder="ex : -3.5678"
              inputMode="decimal"
            />
          </PlanField>
          <PlanField label="GPS approximatif" last>
            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={plan.gpsApprox}
                onChange={(e) => updatePlan('gpsApprox', e.target.checked)}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {plan.gpsApprox ? 'Oui — position approchée' : 'Non — position précise'}
              </span>
            </label>
          </PlanField>
        </div>
      </div>

      {/* Calendrier des prélèvements */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Prélèvements {new Date().getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            {plan.samplings.length > 0 && (
              <button
                onClick={exportAnnualReport}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                <FileText size={14} /> Exporter PDF
              </button>
            )}
            {plan.frequence === 'Personnalisé' ? (
              /* Mode Personnalisé : bouton "+ Ajouter" au lieu de "Générer" */
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
            {plan.samplings.map((s, i) => {
              const cfg = STATUS_CONFIG[s.status]
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
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Formulaire prélèvement ──────────────────────────────────

interface SamplingFormProps {
  sampling: Sampling
  onUpdate: (field: keyof Sampling, value: unknown) => void
  users?: AppUser[]
}

function SamplingForm({ sampling, onUpdate, users = [] }: SamplingFormProps) {
  const [newTask, setNewTask] = useState('')
  const checklist: ChecklistItem[] = sampling.checklist ?? []

  function addTask() {
    const label = newTask.trim()
    if (!label) return
    const item: ChecklistItem = { id: crypto.randomUUID(), label, done: false }
    onUpdate('checklist', [...checklist, item])
    setNewTask('')
  }

  function toggleTask(id: string) {
    onUpdate('checklist', checklist.map((t) => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTask(id: string) {
    onUpdate('checklist', checklist.filter((t) => t.id !== id))
  }

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Statut</label>
        <select value={sampling.status}
          onChange={(e) => onUpdate('status', e.target.value as SamplingStatus)}
          className="field-input w-full">
          <option value="planned">Planifié</option>
          <option value="done">Réalisé</option>
          <option value="overdue">En retard</option>
          <option value="non_effectue">Non effectué</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Heure prévue</label>
        <input
          type="time"
          value={sampling.plannedTime ?? ''}
          onChange={(e) => onUpdate('plannedTime', e.target.value)}
          className="field-input w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Mois prévu</label>
        <select
          value={sampling.plannedMonth}
          onChange={(e) => onUpdate('plannedMonth', parseInt(e.target.value))}
          className="field-input w-full">
          {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Jour prévu
          <span className="ml-1 font-normal" style={{ color: 'var(--color-text-tertiary)' }}>(1–31)</span>
        </label>
        <input
          type="number" min={1} max={31}
          value={sampling.plannedDay || ''}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            if (!isNaN(v) && v >= 1 && v <= 31) onUpdate('plannedDay', v)
            else if (e.target.value === '') onUpdate('plannedDay', 0)
          }}
          className="field-input w-full"
          placeholder="Ex : 15"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date réalisée</label>
        <input type="date" value={sampling.doneDate}
          onChange={(e) => onUpdate('doneDate', e.target.value)}
          className="field-input w-full" />
      </div>

      {sampling.status === 'done' && users.length > 0 && (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Effectué par</label>
          <select
            value={sampling.doneBy ?? ''}
            onChange={(e) => onUpdate('doneBy', e.target.value)}
            className="field-input w-full">
            <option value="">— Sélectionner —</option>
            {users.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.prenom} {u.nom} ({u.initiales})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Nappe</label>
        <select value={sampling.nappe}
          onChange={(e) => onUpdate('nappe', e.target.value as NappeType)}
          className="field-input w-full">
          <option value="">—</option>
          <option value="haute">Haute</option>
          <option value="basse">Basse</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Rapport prévu</label>
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input type="checkbox" checked={sampling.rapportPrevu}
            onChange={(e) => onUpdate('rapportPrevu', e.target.checked)} />
          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {sampling.rapportPrevu ? 'Oui' : 'Non'}
          </span>
        </label>
      </div>

      {sampling.rapportPrevu && (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date rapport</label>
          <input type="date" value={sampling.rapportDate}
            onChange={(e) => onUpdate('rapportDate', e.target.value)}
            className="field-input w-full" />
        </div>
      )}

      <div className="col-span-2">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Commentaire</label>
        <input value={sampling.comment}
          onChange={(e) => onUpdate('comment', e.target.value)}
          placeholder="Remarques…"
          className="field-input w-full" />
      </div>

      {/* Checklist */}
      <div className="col-span-2">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Checklist terrain
        </label>
        {checklist.length > 0 && (
          <div className="rounded-lg overflow-hidden mb-2"
            style={{ border: '1px solid var(--color-border-subtle)' }}>
            {checklist.map((item, i) => (
              <div key={item.id}
                className="flex items-center gap-3 px-3 py-2"
                style={{ borderBottom: i < checklist.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <input type="checkbox" checked={item.done}
                  onChange={() => toggleTask(item.id)}
                  className="cursor-pointer" />
                <span className="flex-1 text-sm"
                  style={{
                    color: item.done ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>
                  {item.label}
                </span>
                <button onClick={() => deleteTask(item.id)}
                  className="shrink-0 p-1 rounded"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Ajouter une tâche…"
            className="field-input flex-1 text-sm"
          />
          <button onClick={addTask}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Motif — visible uniquement si le prélèvement n'a pas été réalisé */}
      {(sampling.status === 'non_effectue' || sampling.status === 'overdue') && (
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Motif de non-réalisation
          </label>
          <input
            value={sampling.motif ?? ''}
            onChange={(e) => onUpdate('motif', e.target.value)}
            placeholder="Ex : Pas d'eau sur site / Annulation client / Accès impossible…"
            className="field-input w-full"
          />
        </div>
      )}
    </div>
  )
}

function PlanField({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <label className="text-sm shrink-0" style={{ color: 'var(--color-text-secondary)', minWidth: '160px' }}>
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  )
}
