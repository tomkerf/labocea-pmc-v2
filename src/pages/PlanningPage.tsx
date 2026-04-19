import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, ExternalLink, Trash2, Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClientsListener, saveClient } from '@/hooks/useClients'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener, saveMaintenance } from '@/hooks/useMaintenances'
import { useEvenementsListener, createEvenement, deleteEvenement } from '@/hooks/useEvenements'
import { useUsersListener } from '@/hooks/useUsers'
import { useMissionsStore } from '@/stores/missionsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useUsersStore } from '@/stores/usersStore'
import { useAuthStore } from '@/stores/authStore'
import type { Client, Sampling, Verification, Maintenance, EvenementPersonnel, TypeEvenement } from '@/types'
import { isSamplingOverdue } from '@/lib/overdue'

// ── Types ───────────────────────────────────────────────────

interface PlanningEvent {
  id: string
  type: 'prelevement' | 'maintenance' | 'verification' | 'evenement'
  title: string
  subtitle: string
  statusLabel: string
  statusBg: string
  statusColor: string
  techColor?: string    // couleur avatar du technicien
  link: string
  isDone: boolean
  technicien: string
  plannedTime?: string
  clientId?: string
  planId?: string
  samplingId?: string
  maintenanceData?: Maintenance
  evenementData?: EvenementPersonnel
}

interface PoolItem {
  sampling: Sampling
  clientId: string
  clientNom: string
  planId: string
  planNom: string
  siteNom: string
  techInitiales: string
  techColor: string
}

type ViewMode = 'semaine' | 'mois'

// ── Helpers ─────────────────────────────────────────────────

const JOURS_COURT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const JOURS_LONG  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MOIS_LONG   = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                     'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function startOfWeek(d: Date): Date {
  const r = new Date(d); const day = r.getDay()
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0,0,0,0); return r
}
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1) }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate()+n); return r }
function addMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth()+n, 1) }
function toISO(d: Date): string { return d.toISOString().split('T')[0] }
function sameDay(a: Date, b: Date): boolean { return toISO(a) === toISO(b) }

function buildMonthGrid(ms: Date): (Date|null)[] {
  const y = ms.getFullYear(), m = ms.getMonth()
  const dim = new Date(y, m+1, 0).getDate()
  const offset = ms.getDay() === 0 ? 6 : ms.getDay()-1
  const cells: (Date|null)[] = []
  for (let i=0; i<offset; i++) cells.push(null)
  for (let d=1; d<=dim; d++) cells.push(new Date(y,m,d))
  while (cells.length%7) cells.push(null)
  return cells
}

// Attribue une couleur déterministe à un technicien à partir de ses initiales.
// Le hash garantit que les mêmes initiales donnent toujours la même couleur,
// et que chaque technicien obtient une couleur distincte de la palette.
const TECH_PALETTE = [
  '#0071E3', // bleu
  '#30B0C7', // cyan
  '#00C7BE', // menthe
  '#5856D6', // indigo
  '#AF52DE', // violet
  '#FF2D55', // rose
  '#A2845E', // marron
  '#636366', // gris
  '#3A6073', // ardoise
]
function colorFromInitiales(initiales: string): string {
  if (!initiales || initiales === '—') return TECH_PALETTE[0]
  let hash = 0
  for (let i = 0; i < initiales.length; i++) {
    hash = initiales.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TECH_PALETTE[Math.abs(hash) % TECH_PALETTE.length]
}

function sortEvts(evts: PlanningEvent[]): PlanningEvent[] {
  return evts.slice().sort((a,b) => {
    if (a.plannedTime && b.plannedTime) return a.plannedTime.localeCompare(b.plannedTime)
    if (a.plannedTime) return -1
    if (b.plannedTime) return 1
    return 0
  })
}

const SAMPLING_CFG: Record<string,{label:string;bg:string;color:string}> = {
  planned:      { label:'Planifié',     bg:'var(--color-bg-tertiary)',   color:'var(--color-text-secondary)' },
  done:         { label:'Réalisé',      bg:'var(--color-success-light)', color:'var(--color-success)' },
  overdue:      { label:'En retard',    bg:'var(--color-danger-light)',  color:'var(--color-danger)' },
  non_effectue: { label:'Non effectué', bg:'var(--color-warning-light)', color:'var(--color-warning)' },
}
const MAINTENANCE_CFG: Record<string,{label:string;bg:string;color:string}> = {
  planifiee:  { label:'Planifiée',  bg:'var(--color-bg-tertiary)',   color:'var(--color-text-secondary)' },
  en_cours:   { label:'En cours',   bg:'var(--color-warning-light)', color:'var(--color-warning)' },
  realisee:   { label:'Réalisée',   bg:'var(--color-success-light)', color:'var(--color-success)' },
  abandonnee: { label:'Abandonnée', bg:'var(--color-danger-light)',  color:'var(--color-danger)' },
}
const EVENEMENT_CFG: Record<TypeEvenement,{label:string;color:string;bg:string}> = {
  rappel:  { label:'Rappel',  color:'var(--color-accent)',  bg:'var(--color-accent-light)'  },
  reunion: { label:'Réunion', color:'#AF52DE',              bg:'#F5EEFF'                    },
  rapport: { label:'Rapport', color:'var(--color-warning)', bg:'var(--color-warning-light)' },
  autre:   { label:'Autre',   color:'var(--color-neutral)', bg:'var(--color-bg-tertiary)'   },
}

// ── DayModal ────────────────────────────────────────────────

interface DayModalProps {
  dateStr: string
  onClose: () => void
  dayEvents: PlanningEvent[]
  pool: PoolItem[]
  uid: string | null
  initiales: string
  navigate: (path: string) => void
  onValidatePool: (item: PoolItem, date: string) => Promise<void>
  onCancelSampling: (event: PlanningEvent) => Promise<void>
}

function DayModal({ dateStr, onClose, dayEvents, pool, uid, initiales, navigate, onValidatePool, onCancelSampling }: DayModalProps) {
  const [poolValidId, setPoolValidId] = useState<string|null>(null)
  const [poolDate, setPoolDate]       = useState(dateStr)
  const [poolSaving, setPoolSaving]   = useState(false)
  const [showEvtForm, setShowEvtForm] = useState(false)
  const [evtTitre, setEvtTitre]       = useState('')
  const [evtType, setEvtType]         = useState<TypeEvenement>('rappel')
  const [evtHeure, setEvtHeure]       = useState('')
  const [evtNotes, setEvtNotes]       = useState('')
  const [evtSaving, setEvtSaving]     = useState(false)

  const date     = new Date(dateStr + 'T12:00:00')
  const dayLabel = date.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const monthLabel = MOIS_LONG[date.getMonth()] + ' ' + date.getFullYear()

  async function handleValidatePool(item: PoolItem) {
    if (poolSaving) return
    setPoolSaving(true)
    try {
      await onValidatePool(item, poolDate)
      setPoolValidId(null)
    } finally {
      setPoolSaving(false)
    }
  }

  async function handleCreateEvt() {
    if (!evtTitre.trim() || !uid) return
    setEvtSaving(true)
    try {
      await createEvenement(evtTitre.trim(), dateStr, evtType, evtHeure, evtNotes, uid, initiales)
      setShowEvtForm(false)
      setEvtTitre(''); setEvtHeure(''); setEvtNotes('')
    } finally {
      setEvtSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full md:max-w-lg flex flex-col overflow-hidden rounded-t-[20px] md:rounded-2xl"
        style={{ background: 'var(--color-bg-primary)', maxHeight: '88vh', boxShadow: 'var(--shadow-modal)' }}
      >
        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="text-base font-semibold capitalize" style={{ color: 'var(--color-text-primary)' }}>
            {dayLabel}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-5">

            {/* ── Section pool : à planifier ce mois ── */}
            <div>
              <p className="text-[10px] font-semibold uppercase mb-2.5"
                style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
                À planifier — {monthLabel}
              </p>
              {pool.length === 0 ? (
                <div className="rounded-xl py-5 text-center"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    Tout est planifié ce mois ✓
                  </p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  {pool.map((item, i) => {
                    const overdue = isSamplingOverdue(item.sampling)
                    const cfg = overdue ? SAMPLING_CFG.overdue : SAMPLING_CFG[item.sampling.status] ?? SAMPLING_CFG.planned
                    const isValidating = poolValidId === item.sampling.id
                    return (
                      <div key={item.sampling.id}
                        style={{ borderBottom: i < pool.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                        <div className="flex items-center gap-3 px-4 py-3">
                          {/* Barre couleur tech */}
                          <div className="w-1 self-stretch rounded-full shrink-0"
                            style={{ background: item.techColor, minHeight: 32 }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                              {item.clientNom}
                            </p>
                            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                              {item.planNom}{item.siteNom ? ` · ${item.siteNom}` : ''}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: cfg.bg, color: cfg.color }}>
                                {cfg.label}
                              </span>
                              {item.techInitiales && item.techInitiales !== '—' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ background: item.techColor + '22', color: item.techColor }}>
                                  {item.techInitiales}
                                </span>
                              )}
                              {item.sampling.plannedDay > 0 && (
                                <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                                  Prévu le {item.sampling.plannedDay}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => isValidating
                              ? setPoolValidId(null)
                              : (setPoolValidId(item.sampling.id), setPoolDate(dateStr))
                            }
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{
                              background: isValidating ? 'var(--color-bg-tertiary)' : 'var(--color-success-light)',
                              color: isValidating ? 'var(--color-text-secondary)' : 'var(--color-success)',
                              border: `1px solid ${isValidating ? 'var(--color-border)' : 'transparent'}`,
                            }}>
                            {isValidating ? 'Annuler' : '→ Ce jour'}
                          </button>
                        </div>

                        {isValidating && (
                          <div className="px-4 py-3 flex items-end gap-3"
                            style={{ background: 'var(--color-bg-tertiary)', borderTop: '1px solid var(--color-border-subtle)' }}>
                            <div className="flex-1">
                              <label className="block text-xs font-medium mb-1"
                                style={{ color: 'var(--color-text-secondary)' }}>
                                Planifier le
                              </label>
                              <input type="date" value={poolDate} onChange={e => setPoolDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                            </div>
                            <button onClick={() => handleValidatePool(item)} disabled={poolSaving || !poolDate}
                              className="px-4 py-2 rounded-lg text-sm font-medium"
                              style={{ background: 'var(--color-success)', color: 'white', opacity: poolSaving ? 0.6 : 1 }}>
                              {poolSaving ? '…' : 'Confirmer'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Section événements du jour ── */}
            {dayEvents.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase mb-2.5"
                  style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
                  Ce jour
                </p>
                <div className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  {dayEvents.map((evt, i) => (
                    <div key={evt.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < dayEvents.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                      <div className="w-1 self-stretch rounded-full shrink-0"
                        style={{ background: evt.techColor ?? evt.statusColor, minHeight: 28 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {evt.title}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                          {evt.subtitle}
                          {evt.plannedTime && ` · ${evt.plannedTime}`}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={{ background: evt.statusBg, color: evt.statusColor }}>
                        {evt.statusLabel}
                      </span>
                      {evt.type === 'evenement' ? (
                        <button onClick={() => evt.evenementData && deleteEvenement(evt.evenementData.id)}
                          className="shrink-0 p-1.5 rounded-lg"
                          style={{ color: 'var(--color-text-tertiary)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}>
                          <Trash2 size={14} />
                        </button>
                      ) : evt.type === 'prelevement' && !evt.isDone ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onCancelSampling(evt)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium"
                            style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
                            title="Retirer du calendrier — redevient à planifier">
                            ↩ Annuler
                          </button>
                          <button onClick={() => { navigate(evt.link); onClose() }}
                            className="shrink-0 p-1.5 rounded-lg"
                            style={{ color: 'var(--color-accent)', background: 'var(--color-accent-light)' }}>
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { navigate(evt.link); onClose() }}
                          className="shrink-0 p-1.5 rounded-lg"
                          style={{ color: 'var(--color-accent)', background: 'var(--color-accent-light)' }}>
                          <ExternalLink size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Section nouvel événement ── */}
            <div>
              <p className="text-[10px] font-semibold uppercase mb-2.5"
                style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
                Ajouter un événement
              </p>
              {!showEvtForm ? (
                <button
                  onClick={() => setShowEvtForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <Plus size={15} /> Nouvel événement
                </button>
              ) : (
                <div className="rounded-xl p-4"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="flex flex-col gap-2.5">
                    <input
                      type="text" value={evtTitre} onChange={e => setEvtTitre(e.target.value)}
                      placeholder="Titre de l'événement…" autoFocus
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      onKeyDown={e => e.key === 'Enter' && handleCreateEvt()} />
                    <div className="flex gap-2">
                      <select value={evtType} onChange={e => setEvtType(e.target.value as TypeEvenement)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                        <option value="rappel">Rappel</option>
                        <option value="reunion">Réunion / Entretien</option>
                        <option value="rapport">Rapport</option>
                        <option value="autre">Autre</option>
                      </select>
                      <input type="time" value={evtHeure} onChange={e => setEvtHeure(e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', width: 110 }} />
                    </div>
                    <input type="text" value={evtNotes} onChange={e => setEvtNotes(e.target.value)}
                      placeholder="Notes (optionnel)"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                    <div className="flex items-center justify-between">
                      <button onClick={() => setShowEvtForm(false)} className="text-xs px-2 py-1"
                        style={{ color: 'var(--color-text-tertiary)' }}>
                        Annuler
                      </button>
                      <button onClick={handleCreateEvt} disabled={!evtTitre.trim() || evtSaving}
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ background: evtTitre.trim() ? 'var(--color-accent)' : 'var(--color-border)', color: 'white', opacity: evtSaving ? 0.6 : 1 }}>
                        {evtSaving ? 'Ajout…' : 'Ajouter'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ─────────────────────────────────────

export default function PlanningPage() {
  useClientsListener(); useEquipementsListener()
  useVerificationsListener(); useMaintenancesListener()
  useEvenementsListener(); useUsersListener()

  const navigate   = useNavigate()
  const uid        = useAuthStore(s => s.uid())
  const initiales  = useAuthStore(s => s.initiales())
  const { clients }       = useMissionsStore()
  const { verifications } = useMetrologieStore()
  const { maintenances }  = useMaintenancesStore()
  const { evenements }    = useEvenementsStore()
  const { users }         = useUsersStore()

  const today = new Date(); today.setHours(0,0,0,0)

  const [viewMode,    setViewMode]    = useState<ViewMode>('mois')
  const [weekStart,   setWeekStart]   = useState(() => startOfWeek(today))
  const [monthStart,  setMonthStart]  = useState(() => startOfMonth(today))
  const [selectedDate,setSelectedDate]= useState(today)
  const [filterTech,  setFilterTech]  = useState('')
  const [filterRetard,setFilterRetard]= useState(false)
  const [selectedDay, setSelectedDay] = useState<string|null>(null)

  // Validation inline (EventRow)
  const [validatingId,   setValidatingId]   = useState<string|null>(null)
  const [validationDate, setValidationDate] = useState(toISO(today))
  const [saving, setSaving] = useState(false)

  const weekDays  = useMemo(() => Array.from({length:7},(_,i) => addDays(weekStart,i)), [weekStart])
  const monthGrid = useMemo(() => buildMonthGrid(monthStart), [monthStart])
  const isWeekend = (d: Date) => { const day = d.getDay(); return day===0||day===6 }

  // ── Couleurs techniciens (initiales → couleur) ──────────
  // Priorité : avatarColor choisi par l'user > couleur auto (hash des initiales)

  const colorByInitiales = useMemo(() => {
    const map: Record<string,string> = {}
    users.forEach(u => {
      if (u.initiales) map[u.initiales] = u.avatarColor ?? colorFromInitiales(u.initiales)
    })
    return map
  }, [users])

  // Retourne la couleur d'un technicien par ses initiales —
  // utilise le store si l'user est connu, sinon calcule le hash.
  function getTechColor(initiales: string): string {
    if (!initiales || initiales === '—') return TECH_PALETTE[0]
    return colorByInitiales[initiales] ?? colorFromInitiales(initiales)
  }

  // ── Index date → events ─────────────────────────────────

  const eventsByDate = useMemo(() => {
    const map: Record<string,PlanningEvent[]> = {}
    const year = new Date().getFullYear()
    const add = (dateStr:string, e:PlanningEvent) => {
      if (!dateStr) return
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(e)
    }

    clients.forEach((client: Client) => {
      client.plans.forEach(plan => {
        const isAuto = plan.methode === 'Automatique'
        const baseSub = plan.siteNom || plan.nom || '—'
        plan.samplings.forEach((s:Sampling) => {
          const overdue = isSamplingOverdue(s)
          const dateStr = s.doneDate || toISO(new Date(year, s.plannedMonth, s.plannedDay||1))
          const cfg = overdue ? SAMPLING_CFG.overdue : SAMPLING_CFG[s.status] ?? SAMPLING_CFG.planned
          const common = {
            type: 'prelevement' as const,
            statusLabel:cfg.label, statusBg:cfg.bg, statusColor:cfg.color,
            techColor: getTechColor(client.preleveur),
            link:`/missions/${client.id}/plan/${plan.id}/sampling/${s.id}`,
            isDone: s.status==='done', technicien: client.preleveur||'—',
            plannedTime: s.plannedTime, clientId:client.id, planId:plan.id, samplingId:s.id,
          }
          // Jour 1 (ou jour unique pour les méthodes ponctuelles / composite)
          add(dateStr, {
            ...common,
            id: s.id,
            title: client.nom,
            subtitle: isAuto ? `${baseSub} · Bilan 24h J1` : baseSub,
          })
          // Méthode Automatique = bilan 24h → occupe aussi le lendemain (J2)
          if (isAuto) {
            const dateStr2 = toISO(addDays(new Date(dateStr + 'T12:00:00'), 1))
            add(dateStr2, {
              ...common,
              id: `${s.id}_j2`,
              title: client.nom,
              subtitle: `${baseSub} · Bilan 24h J2`,
            })
          }
        })
      })
    })

    maintenances.forEach((m:Maintenance) => {
      const dateStr = m.dateRealisee||m.datePrevue
      const cfg = MAINTENANCE_CFG[m.statut]??MAINTENANCE_CFG.planifiee
      add(dateStr, {
        id:m.id, type:'maintenance',
        title:m.equipementNom||'Équipement',
        subtitle: m.type==='preventive'?'Maintenance préventive':m.type==='corrective'?'Maintenance corrective':'Panne',
        statusLabel:cfg.label, statusBg:cfg.bg, statusColor:cfg.color,
        techColor: getTechColor(m.technicienNom),
        link:`/maintenances/${m.id}`, isDone:m.statut==='realisee', technicien:m.technicienNom||'—',
        maintenanceData:m,
      })
    })

    verifications.forEach((v:Verification) => {
      if (!v.prochainControle) return
      add(v.prochainControle, {
        id:v.id, type:'verification',
        title:v.equipementNom||'Équipement',
        subtitle: v.type==='etalonnage_interne'?'Étalonnage interne':v.type==='verification_externe'?'Vérification externe':'Contrôle terrain',
        statusLabel:'Métrologie', statusBg:'var(--color-accent-light)', statusColor:'var(--color-accent)',
        techColor: getTechColor(v.technicienNom),
        link:`/metrologie/${v.id}`, isDone:false, technicien:v.technicienNom||'—',
      })
    })

    evenements.forEach((ev:EvenementPersonnel) => {
      const cfg = EVENEMENT_CFG[ev.type]??EVENEMENT_CFG.autre
      add(ev.date, {
        id:ev.id, type:'evenement',
        title:ev.titre, subtitle:cfg.label,
        statusLabel:cfg.label, statusBg:cfg.bg, statusColor:cfg.color,
        techColor: getTechColor(ev.createdByInitiales ?? ''),
        link:'', isDone:false, technicien:ev.createdByInitiales||'—',
        plannedTime:ev.heure||undefined, evenementData:ev,
      })
    })

    return map
  }, [clients, maintenances, verifications, evenements, colorByInitiales])

  // ── Filtrage technicien ─────────────────────────────────

  const allTechs = useMemo(() => {
    const s = new Set<string>()
    Object.values(eventsByDate).flat().forEach(e => { if (e.technicien&&e.technicien!=='—') s.add(e.technicien) })
    return Array.from(s).sort()
  }, [eventsByDate])

  function filteredForDay(dateStr:string): PlanningEvent[] {
    let evts = eventsByDate[dateStr]??[]
    if (filterTech) evts = evts.filter(e => e.technicien===filterTech)
    if (filterRetard) evts = evts.filter(e => e.statusColor==='var(--color-danger)'||e.statusLabel==='En retard')
    return sortEvts(evts)
  }

  const totalOverdue = useMemo(() => {
    let n=0
    clients.forEach((c:Client) => c.plans.forEach(p => p.samplings.forEach((s:Sampling) => { if (isSamplingOverdue(s)) n++ })))
    return n
  }, [clients])

  // ── Pool samplings non faits du mois sélectionné ────────

  const poolSamplings = useMemo((): PoolItem[] => {
    if (!selectedDay) return []
    const month = new Date(selectedDay + 'T12:00:00').getMonth()
    const result: PoolItem[] = []
    clients.forEach((client: Client) => {
      client.plans.forEach(plan => {
        plan.samplings.forEach((s: Sampling) => {
          if (s.plannedMonth === month && s.status !== 'done') {
            result.push({
              sampling: s,
              clientId: client.id,
              clientNom: client.nom,
              planId: plan.id,
              planNom: plan.nom,
              siteNom: plan.siteNom,
              techInitiales: client.preleveur || '—',
              techColor: getTechColor(client.preleveur),
            })
          }
        })
      })
    })
    // Tri : en retard en premier, puis par client
    return result.sort((a, b) => {
      const aOvr = isSamplingOverdue(a.sampling) ? 0 : 1
      const bOvr = isSamplingOverdue(b.sampling) ? 0 : 1
      if (aOvr !== bOvr) return aOvr - bOvr
      return a.clientNom.localeCompare(b.clientNom)
    })
  }, [selectedDay, clients, colorByInitiales])

  // ── Liste période (mobile) ──────────────────────────────

  const periodList = useMemo(() => {
    const days: Date[] = viewMode==='semaine'
      ? weekDays
      : Array.from({length: new Date(monthStart.getFullYear(),monthStart.getMonth()+1,0).getDate()},
          (_,i) => new Date(monthStart.getFullYear(),monthStart.getMonth(),i+1))
    return days
      .map(date => ({ date, dateStr:toISO(date), events: filteredForDay(toISO(date)) }))
      .filter(g => g.events.length>0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, weekDays, monthStart, eventsByDate, filterTech, filterRetard])

  // ── Validation inline ───────────────────────────────────

  async function handleValidate(event:PlanningEvent) {
    if (!uid||saving) return
    setSaving(true)
    try {
      if (event.type==='prelevement'&&event.clientId&&event.planId&&event.samplingId) {
        const client = clients.find((c:Client)=>c.id===event.clientId)
        if (!client) return
        await saveClient({
          ...client,
          plans: client.plans.map(plan => plan.id!==event.planId ? plan : {
            ...plan,
            samplings: plan.samplings.map((s:Sampling) =>
              s.id===event.samplingId ? {...s,status:'done'as const,doneDate:validationDate,doneBy:uid} : s
            )
          })
        }, uid)
      }
      if (event.type==='maintenance'&&event.maintenanceData) {
        await saveMaintenance({...event.maintenanceData, statut:'realisee', dateRealisee:validationDate}, uid)
      }
      setValidatingId(null)
    } finally { setSaving(false) }
  }

  // ── Validation depuis le DayModal ───────────────────────

  // Retire un sampling du calendrier → remet plannedDay à 0, il revient dans le pool
  async function handleCancelSampling(event: PlanningEvent) {
    if (!uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== event.samplingId ? s : { ...s, plannedDay: 0 }
        )
      })
    }, uid)
  }

  // Planifie un sampling à un jour précis du mois (sans le marquer "fait")
  async function handleValidatePool(item: PoolItem, date: string) {
    if (!uid) return
    const client = clients.find((c: Client) => c.id === item.clientId)
    if (!client) return
    const plannedDay = new Date(date + 'T12:00:00').getDate()
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== item.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== item.sampling.id ? s : { ...s, plannedDay }
        )
      })
    }, uid)
  }

  const isValidationWeekend = useMemo(() => {
    const d = new Date(validationDate+'T12:00:00'); return d.getDay()===0||d.getDay()===6
  }, [validationDate])

  // ── Navigation ──────────────────────────────────────────

  function prev() {
    if (viewMode==='semaine') setWeekStart(addDays(weekStart,-7))
    else setMonthStart(addMonths(monthStart,-1))
    setSelectedDay(null); setValidatingId(null)
  }
  function next() {
    if (viewMode==='semaine') setWeekStart(addDays(weekStart,7))
    else setMonthStart(addMonths(monthStart,1))
    setSelectedDay(null); setValidatingId(null)
  }
  function goToday() {
    setWeekStart(startOfWeek(today)); setMonthStart(startOfMonth(today))
    setSelectedDate(today); setSelectedDay(null); setValidatingId(null)
  }
  function switchView(m:ViewMode) {
    setViewMode(m)
    if (m==='mois') setMonthStart(startOfMonth(selectedDate))
    if (m==='semaine') setWeekStart(startOfWeek(selectedDate))
    setSelectedDay(null); setValidatingId(null)
  }

  // ── Label période ───────────────────────────────────────

  const periodLabel = viewMode==='semaine' ? (() => {
    const end = addDays(weekStart,6)
    if (weekStart.getMonth()===end.getMonth())
      return `${weekStart.getDate()}–${end.getDate()} ${MOIS_LONG[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    return `${weekStart.getDate()} ${MOIS_LONG[weekStart.getMonth()]} – ${end.getDate()} ${MOIS_LONG[end.getMonth()]} ${end.getFullYear()}`
  })() : `${MOIS_LONG[monthStart.getMonth()]} ${monthStart.getFullYear()}`

  // ── EventPill (calendrier desktop) ─────────────────────

  function EventPill({ event }: { event:PlanningEvent }) {
    return (
      <button
        onClick={e => { e.stopPropagation(); if (event.type !== 'evenement') navigate(event.link) }}
        className="w-full text-left flex items-center gap-1.5 px-1.5 py-[3px] rounded-[5px] text-[11px] leading-snug"
        style={{ background: event.statusBg, cursor: event.type === 'evenement' ? 'default' : 'pointer' }}
        title={`${event.title} — ${event.subtitle}`}
      >
        {/* Dot couleur tech (ou statut si pas de tech) */}
        <span className="shrink-0 w-[7px] h-[7px] rounded-full"
          style={{ background: event.techColor ?? event.statusColor }} />
        <span className="flex-1 truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {event.title}
        </span>
        {event.plannedTime && (
          <span className="shrink-0 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {event.plannedTime}
          </span>
        )}
      </button>
    )
  }

  // ── EventRow (liste mobile + desktop) ──────────────────

  function EventRow({ event, isLast }: { event:PlanningEvent; isLast:boolean }) {
    const isValidating = validatingId===event.id
    const isEvt = event.type==='evenement'
    const dotColor = event.techColor ?? event.statusColor

    return (
      <div style={{ borderBottom: isLast?'none':'1px solid var(--color-border-subtle)' }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-1 self-stretch rounded-full shrink-0" style={{ background:dotColor, minHeight:36 }} />

          {isEvt ? (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color:'var(--color-text-primary)' }}>{event.title}</p>
              {event.plannedTime && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block"
                  style={{ background:'var(--color-accent-light)', color:'var(--color-accent)' }}>
                  {event.plannedTime}
                </span>
              )}
            </div>
          ) : (
            <button className="flex-1 min-w-0 text-left" onClick={() => navigate(event.link)}>
              <p className="text-sm font-medium truncate" style={{ color:'var(--color-text-primary)' }}>{event.title}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color:'var(--color-text-secondary)' }}>{event.subtitle}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {event.plannedTime && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                    style={{ background:'var(--color-accent-light)', color:'var(--color-accent)' }}>
                    {event.plannedTime}
                  </span>
                )}
                {event.technicien&&event.technicien!=='—' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: dotColor + '22', color: dotColor }}>
                    {event.technicien}
                  </span>
                )}
              </div>
            </button>
          )}

          <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
            style={{ background:event.statusBg, color:event.statusColor }}>
            {event.statusLabel}
          </span>

          {isEvt ? (
            <button onClick={() => event.evenementData&&deleteEvenement(event.evenementData.id)}
              className="shrink-0 p-1.5 rounded-lg" style={{ color:'var(--color-text-tertiary)' }}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--color-danger)')}
              onMouseLeave={e=>(e.currentTarget.style.color='var(--color-text-tertiary)')}>
              <Trash2 size={15} />
            </button>
          ) : event.isDone ? (
            <CheckCircle2 size={20} className="shrink-0" style={{ color:'var(--color-success)' }} />
          ) : event.type==='verification' ? (
            <button onClick={() => navigate(event.link)} className="shrink-0 p-1.5 rounded-lg"
              style={{ color:'var(--color-accent)', background:'var(--color-accent-light)' }}>
              <ExternalLink size={15} />
            </button>
          ) : (
            <button
              onClick={() => isValidating ? setValidatingId(null) : (setValidatingId(event.id), setValidationDate(toISO(today)))}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: isValidating?'var(--color-bg-tertiary)':'var(--color-success-light)',
                color: isValidating?'var(--color-text-secondary)':'var(--color-success)',
                border: `1px solid ${isValidating?'var(--color-border)':'transparent'}`,
              }}>
              {isValidating?'Annuler':'✓ Valider'}
            </button>
          )}
        </div>

        {isValidating && !isEvt && (
          <div className="px-5 py-4 flex flex-col gap-3"
            style={{ background:'var(--color-bg-tertiary)', borderTop:'1px solid var(--color-border-subtle)' }}>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1.5" style={{ color:'var(--color-text-secondary)' }}>
                  Date de réalisation
                </label>
                <input type="date" value={validationDate} onChange={e=>setValidationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background:'var(--color-bg-secondary)', border:'1px solid var(--color-border)', color:'var(--color-text-primary)' }} />
              </div>
              <button onClick={() => handleValidate(event)} disabled={saving||!validationDate}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background:'var(--color-success)', color:'white', opacity:saving?0.6:1 }}>
                {saving?'…':'Confirmer'}
              </button>
            </div>
            {isValidationWeekend && (
              <p className="text-xs px-3 py-2 rounded-lg"
                style={{ background:'var(--color-warning-light)', color:'var(--color-warning)' }}>
                ⚠️ Intervention un week-end — vérifiez la date.
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* En-tête navigation */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0 flex-wrap gap-2"
        style={{ borderBottom:'1px solid var(--color-border-subtle)', background:'var(--color-bg-secondary)' }}>

        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-1.5 rounded-lg" style={{ color:'var(--color-text-secondary)' }}
            onMouseEnter={e=>(e.currentTarget.style.background='var(--color-bg-tertiary)')}
            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold min-w-[180px] text-center" style={{ color:'var(--color-text-primary)' }}>
            {periodLabel}
          </span>
          <button onClick={next} className="p-1.5 rounded-lg" style={{ color:'var(--color-text-secondary)' }}
            onMouseEnter={e=>(e.currentTarget.style.background='var(--color-bg-tertiary)')}
            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <ChevronRight size={18} />
          </button>
          <button onClick={goToday}
            className="hidden md:block px-2.5 py-1 rounded-lg text-xs font-medium ml-1"
            style={{ background:'var(--color-bg-tertiary)', color:'var(--color-text-secondary)', border:'1px solid var(--color-border-subtle)' }}>
            Aujourd'hui
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle vue */}
          <div className="flex rounded-lg overflow-hidden"
            style={{ border:'1px solid var(--color-border-subtle)', background:'var(--color-bg-tertiary)' }}>
            {(['semaine','mois'] as ViewMode[]).map(m => (
              <button key={m} onClick={() => switchView(m)}
                className="px-3 py-1 text-xs font-medium capitalize"
                style={{ background:viewMode===m?'var(--color-accent)':'transparent', color:viewMode===m?'white':'var(--color-text-secondary)' }}>
                {m}
              </button>
            ))}
          </div>

          {/* Filtre retard */}
          {totalOverdue>0 && (
            <button onClick={() => setFilterRetard(v=>!v)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background:filterRetard?'var(--color-danger)':'var(--color-danger-light)', color:filterRetard?'white':'var(--color-danger)' }}>
              ⚠ {totalOverdue} en retard
            </button>
          )}

          {/* Filtre technicien — badges colorés */}
          {allTechs.length>1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setFilterTech('')}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background:!filterTech?'var(--color-accent)':'var(--color-bg-secondary)', color:!filterTech?'white':'var(--color-text-secondary)', border:`1px solid ${!filterTech?'transparent':'var(--color-border-subtle)'}` }}>
                Tous
              </button>
              {allTechs.map(t => {
                const tColor = getTechColor(t)
                const isActive = filterTech === t
                return (
                  <button key={t} onClick={() => setFilterTech(t===filterTech?'':t)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: isActive ? tColor : 'var(--color-bg-secondary)',
                      color: isActive ? 'white' : tColor,
                      border: `1px solid ${isActive ? 'transparent' : tColor + '66'}`,
                    }}>
                    {t}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP : vue calendrier grille ── */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">

        {viewMode==='semaine' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* En-têtes colonnes */}
            <div className="grid grid-cols-7 shrink-0"
              style={{ borderBottom:'1px solid var(--color-border-subtle)' }}>
              {weekDays.map((day,i) => {
                const isToday = sameDay(day,today)
                const isWE = isWeekend(day)
                return (
                  <div key={i} className="py-2 px-2 text-center"
                    style={{ borderRight: i<6?'1px solid var(--color-border-subtle)':'none' }}>
                    <div className="text-[10px] font-medium uppercase mb-1"
                      style={{ color:'var(--color-text-tertiary)', letterSpacing:'0.04em' }}>
                      {JOURS_COURT[i]}
                    </div>
                    <div className="w-7 h-7 flex items-center justify-center rounded-full mx-auto text-sm font-semibold"
                      style={{
                        background: isToday ? '#FF3B30' : 'transparent',
                        color: isToday ? 'white' : isWE ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                      }}>
                      {day.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Colonnes événements */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto">
              {weekDays.map((day,i) => {
                const dateStr = toISO(day)
                const evts = filteredForDay(dateStr)
                const isToday = sameDay(day,today)
                const isWE = isWeekend(day)
                return (
                  <div key={i}
                    className="p-1.5 flex flex-col gap-1 cursor-pointer group"
                    onClick={() => setSelectedDay(dateStr)}
                    style={{
                      borderRight: i<6?'1px solid var(--color-border-subtle)':'none',
                      background: isToday?'rgba(255,59,48,0.04)':isWE?'rgba(0,0,0,0.015)':'transparent',
                      minHeight: 120,
                    }}>
                    {evts.map(evt => <EventPill key={evt.id} event={evt} />)}
                    {/* Bouton + au survol */}
                    <div className="mt-auto flex items-center justify-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px]" style={{ color:'var(--color-text-tertiary)' }}>
                        <Plus size={10} className="inline" /> Ajouter
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {viewMode==='mois' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* En-têtes jours */}
            <div className="grid grid-cols-7 shrink-0"
              style={{ borderBottom:'1px solid var(--color-border-subtle)' }}>
              {JOURS_COURT.map((j,i) => (
                <div key={j} className="py-2 text-center text-[10px] font-medium uppercase"
                  style={{ color:'var(--color-text-tertiary)', letterSpacing:'0.04em',
                    borderRight:i<6?'1px solid var(--color-border-subtle)':'none' }}>
                  {j}
                </div>
              ))}
            </div>
            {/* Grille */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto" style={{ gridAutoRows:'1fr' }}>
              {monthGrid.map((day,i) => {
                if (!day) return (
                  <div key={i} style={{
                    borderRight:(i%7)<6?'1px solid var(--color-border-subtle)':'none',
                    borderBottom:'1px solid var(--color-border-subtle)',
                    background:'rgba(0,0,0,0.015)',
                  }} />
                )
                const dateStr = toISO(day)
                const evts = filteredForDay(dateStr)
                const isToday = sameDay(day,today)
                const isWE = isWeekend(day)
                const MAX = 3
                return (
                  <div key={i}
                    className="p-1 flex flex-col gap-0.5 cursor-pointer group"
                    onClick={() => setSelectedDay(dateStr)}
                    style={{
                      borderRight:(i%7)<6?'1px solid var(--color-border-subtle)':'none',
                      borderBottom:'1px solid var(--color-border-subtle)',
                      background: isToday?'rgba(255,59,48,0.04)':isWE?'rgba(0,0,0,0.015)':'transparent',
                      minHeight: 90,
                    }}>
                    <div className="flex items-center justify-between mb-0.5 px-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-semibold"
                          style={{
                            background: isToday ? '#FF3B30' : 'transparent',
                            color: isToday ? 'white' : isWE ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                          }}>
                          {day.getDate()}
                        </span>
                        {day.getDate()===1 && (
                          <span className="text-[10px] font-normal" style={{ color:'var(--color-text-tertiary)' }}>
                            {MOIS_LONG[day.getMonth()].slice(0,3).toLowerCase()}.
                          </span>
                        )}
                      </span>
                      <Plus size={10} className="opacity-0 group-hover:opacity-60 transition-opacity"
                        style={{ color:'var(--color-text-tertiary)' }} />
                    </div>
                    {evts.slice(0,MAX).map(evt => <EventPill key={evt.id} event={evt} />)}
                    {evts.length>MAX && (
                      <span className="text-[10px] pl-1 mt-0.5" style={{ color:'var(--color-text-tertiary)' }}>
                        +{evts.length-MAX} autres
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE : scroll vertical liste ── */}
      <div className="md:hidden flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">
          {periodList.length===0 ? (
            <div className="rounded-xl px-5 py-12 text-center"
              style={{ background:'var(--color-bg-secondary)', border:'1px solid var(--color-border-subtle)' }}>
              <p className="text-sm" style={{ color:'var(--color-text-tertiary)' }}>
                {filterRetard ? 'Aucun prélèvement en retard.' : 'Aucune intervention cette période.'}
              </p>
              <button onClick={goToday} className="mt-3 text-xs" style={{ color:'var(--color-accent)' }}>
                Revenir à aujourd'hui
              </button>
            </div>
          ) : (
            periodList.map(({date, dateStr, events}) => {
              const isToday = sameDay(date,today)
              const dayIdx = (date.getDay()+6)%7
              return (
                <div key={dateStr}>
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-xs font-semibold capitalize"
                      style={{ color:isToday?'#FF3B30':'var(--color-text-secondary)' }}>
                      {JOURS_LONG[dayIdx]} {date.getDate()} {MOIS_LONG[date.getMonth()]}
                    </span>
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background:'rgba(255,59,48,0.1)', color:'#FF3B30' }}>
                        Aujourd'hui
                      </span>
                    )}
                    <button onClick={() => setSelectedDay(dateStr)}
                      className="ml-auto flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ color:'var(--color-text-tertiary)', border:'1px solid var(--color-border-subtle)' }}>
                      <Plus size={9} /> Ajouter
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden"
                    style={{ background:'var(--color-bg-secondary)', border:'1px solid var(--color-border-subtle)', boxShadow:'var(--shadow-card)' }}>
                    {events.map((evt,i) => <EventRow key={evt.id} event={evt} isLast={i===events.length-1} />)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── DayModal ── */}
      {selectedDay && (
        <DayModal
          key={selectedDay}
          dateStr={selectedDay}
          onClose={() => setSelectedDay(null)}
          dayEvents={filteredForDay(selectedDay)}
          pool={poolSamplings}
          uid={uid}
          initiales={initiales}
          navigate={navigate}
          onValidatePool={handleValidatePool}
          onCancelSampling={handleCancelSampling}
        />
      )}

    </div>
  )
}
